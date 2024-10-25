const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');



const firebaseConfig = {
    apiKey: "AIzaSyDFCc-RedPIZf2JTbHb0OSx1EVsheX-g2o",
    authDomain: "kashmir-scanme.firebaseapp.com",
    projectId: "kashmir-scanme",
    storageBucket: "kashmir-scanme.appspot.com",
    messagingSenderId: "158686902270",
    appId: "1:158686902270:web:b752e2bb72a7f9f48f32af",
    measurementId: "G-P5G1H3H7Y1"
  };
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  module.exports = { db };
  