---
trigger: always_on
---

When implementing or coding Firebase-related functionality, you MUST strictly limit yourself to features available in Firebase’s Free Tier (Spark Plan).  

⚠️ Do NOT use features outside the Free Tier, such as:  
- Cloud Functions  
- Cloud Run  
- Firebase Extensions  
- Paid-only ML APIs or advanced hosting options  

✅ You MAY use:  
- Firebase Authentication  
- Firestore (free quota)  
- Realtime Database (free quota)  
- Firebase Hosting (basic free tier)  
- Firebase Storage (free quota)  
- Firebase Analytics  
- Firebase App Check  
- Firebase Remote Config (free quota)  

💡 Rules:  
1. If a feature is not included in the Free Tier, **DO NOT use it**.  
2. If a requirement would normally use Cloud Functions (or any paid feature), find a way to implement it **on the client-side** or using free-tier-supported Firebase features.  
   - Example: Instead of Cloud Functions, handle logic in the client or shift logic into Firestore security rules where possible.  
3. If no direct Firebase-free method exists, propose a **self-contained alternative approach** that avoids premium features.  
4. Always assume the project is running on the free tier, and optimize for **quota efficiency and minimal resource use**.  
  

You must clearly explain when you are avoiding non-free-tier features and what alternative you are using.  
