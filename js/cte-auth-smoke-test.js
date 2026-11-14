/* Standalone Firebase Google sign-in verification.
 * No database SDK import and no database reads/writes.
 * Commissioner custom claims are deliberately NOT changed here.
 */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';

const $=id=>document.getElementById(id);
const status=$('status'),error=$('error'),signInButton=$('signIn'),signOutButton=$('signOut');
const result=$('result'),uid=$('uid'),email=$('email'),copyUid=$('copyUid');
const config=window.CTE_FIREBASE_CONFIG;
function showError(e){
 const code=String(e?.code||'authentication/error');
 const allowed=new Set(['auth/popup-blocked','auth/popup-closed-by-user','auth/unauthorized-domain','auth/operation-not-allowed','auth/network-request-failed','auth/cancelled-popup-request','auth/account-exists-with-different-credential']);
 error.hidden=false;
 error.textContent=allowed.has(code)?'Sign-in failed: '+code+'. Please report this error code.':'Google sign-in could not complete. Try again or report the error code: '+code;
 status.textContent='Sign-in not confirmed.';
}
function renderUser(user){
 error.hidden=true;
 const connected=!!user;
 result.hidden=!connected;
 signInButton.hidden=connected;
 signOutButton.hidden=!connected;
 if(connected){
  $('project').textContent=config.projectId;
  uid.textContent=user.uid;
  email.textContent=user.email||'No email provided';
  status.textContent='Google authentication succeeded. No database data was accessed.';
 }else{
  uid.textContent='';email.textContent='';
  status.textContent='Ready to connect a Google account.';
 }
}
if(!config?.projectId||!config?.apiKey||!config?.authDomain){
 signInButton.disabled=true;
 error.hidden=false;
 error.textContent='Firebase configuration is missing. This page cannot sign in.';
 status.textContent='Configuration error.';
}else{
 try{
  const app=initializeApp(config,'cte-google-auth-smoke');
  const auth=getAuth(app);
  signInButton.disabled=false;
  signInButton.addEventListener('click',async()=>{
   signInButton.disabled=true;error.hidden=true;status.textContent='Opening Google sign-in…';
   try{await signInWithPopup(auth,new GoogleAuthProvider());}
   catch(e){showError(e);}
   finally{signInButton.disabled=false;}
  });
  signOutButton.addEventListener('click',async()=>{
   signOutButton.disabled=true;
   try{await signOut(auth);}catch(e){showError(e)}
   finally{signOutButton.disabled=false;}
  });
  copyUid.addEventListener('click',async()=>{
   if(!auth.currentUser)return;
   try{await navigator.clipboard.writeText(auth.currentUser.uid);copyUid.textContent='Copied';}
   catch(_){copyUid.textContent='Select the UID above to copy';}
  });
  onAuthStateChanged(auth,renderUser,showError);
 }catch(e){showError(e);signInButton.disabled=true;}
}
