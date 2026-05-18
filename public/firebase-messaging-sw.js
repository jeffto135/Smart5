/* eslint-disable no-undef */
// Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker.
// These values are extracted from firebase-applet-config.json
firebase.initializeApp({
  apiKey: "AIzaSyCAM2sX_OVXioieZYZG5Jyyk3gB_tLxddU",
  authDomain: "smart5-nine.firebaseapp.com",
  projectId: "smart5-nine",
  storageBucket: "smart5-nine.appspot.com",
  messagingSenderId: "592243449709",
  appId: "1:592243449709:web:e10c4ce39444c462fe0464"
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
