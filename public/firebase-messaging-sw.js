/* eslint-disable no-undef */
// Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker.
// These values are extracted from firebase-applet-config.json
firebase.initializeApp({
  apiKey: "TODO_REPLACE_WITH_SMART5_NINE_API_KEY",
  authDomain: "smart5-nine.firebaseapp.com",
  projectId: "smart5-nine",
  storageBucket: "smart5-nine.appspot.com",
  messagingSenderId: "TODO_REPLACE_WITH_SMART5_NINE_SENDER_ID",
  appId: "TODO_REPLACE_WITH_SMART5_NINE_APP_ID"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Smart5 Owners Update';
  const notificationOptions = {
    body: payload.notification?.body || '您有新的智慧型車主訊位更新。',
    icon: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
    badge: 'https://effortless.com.hk/wp-content/uploads/2026/05/Smart5-owners-club-HK-logo-1-768x700.png',
    tag: 'smart5-notification',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
