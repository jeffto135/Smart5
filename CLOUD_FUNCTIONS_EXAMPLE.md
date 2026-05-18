# Firebase Cloud Functions 推播範例

此文件提供了如何使用 Firebase Admin SDK 在後端發送推播通知給車主的範例程式碼。

## 1. 環境設定
確保您的伺服器環境已安裝 `firebase-admin`：
```bash
npm install firebase-admin
```

## 2. 發送通知函數 (Node.js)

```javascript
const admin = require('firebase-admin');

// 初始化 Admin SDK (如果尚未初始化)
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * 發送推播給指定用戶的所有設備
 * @param {string} userId - 用戶的 UID
 * @param {string} title - 通知標題
 * @param {string} body - 通知內容
 * @param {Object} data - 選填，附加的數據 (如 { activityId: '123' })
 */
async function notifyUser(userId, title, body, data = {}) {
  try {
    // 1. 從 Firestore 獲取該用戶所有的 FCM Tokens
    const tokensSnapshot = await admin.firestore()
      .collection(`users/${userId}/tokens`)
      .get();
    
    const tokens = tokensSnapshot.docs.map(doc => doc.id);
    
    if (tokens.length === 0) {
      console.log(`用戶 ${userId} 沒有已登記的設備 Token。`);
      return;
    }

    // 2. 構建訊息列表
    const messages = tokens.map(token => ({
      token,
      notification: {
        title,
        body
      },
      data, // 供前端處理點擊邏輯
      webpush: {
        notification: {
          title,
          body,
          icon: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
          badge: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
          tag: 'smart5-update'
        }
      }
    }));

    // 3. 執行發送
    const response = await admin.messaging().sendEach(messages);
    
    // 4. 清理無效的 Token (選用)
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (error.code === 'messaging/registration-token-not-registered' || 
            error.code === 'messaging/invalid-registration-token') {
          const invalidToken = tokens[idx];
          console.log(`正在移除過期 Token: ${invalidToken}`);
          admin.firestore()
            .doc(`users/${userId}/tokens/${invalidToken}`)
            .delete()
            .catch(err => console.error('Token 刪除失敗', err));
        }
      }
    });

    console.log(`成功發送 ${response.successCount} 條訊息`);
    return response;
  } catch (error) {
    console.error('發送推播失敗:', error);
    throw error;
  }
}

/**
 * 廣播活動通知給所有車主 (範例)
 */
async function broadcastActivity(activityTitle) {
  const usersSnapshot = await admin.firestore().collection('userProfiles').get();
  
  for (const userDoc of usersSnapshot.docs) {
    await notifyUser(
      userDoc.id, 
      '新活動發佈 / NEW ACTIVITY', 
      `活動「${activityTitle}」現已開放報名！`
    );
  }
}
```

## 3. 重要提醒

1. **VAPID Key**: 您需要在 Firebase Console 的 **專案設定 > 雲端通訊 (Cloud Messaging) > Web 驗證** 中生成一個 Web Push 憑證 (Key Pair)，並將其設置為環境變量 `VITE_FIREBASE_VAPID_KEY`。
2. **HTTPS**: 網頁推播通知僅在 HTTPS 環境下運作 (Localhost 除外)。
3. **背景處理**: `public/firebase-messaging-sw.js` 負責在網頁關閉時顯示通知。請確保該檔案可透過網址直接訪問。
