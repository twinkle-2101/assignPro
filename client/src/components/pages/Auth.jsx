import React from "react";
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../../utils/firebase.js";
import axios from 'axios';
import { useAuth } from "../../context/AuthContext.jsx";
import { getApiUrl } from "../../config/api.config.js";

function Auth({ onError }){

    const { login } = useAuth();

    const handleGoogleAuth = async () =>{
     try{
      const response = await signInWithPopup(auth , provider);
      const user = response.user;
      const name = user.displayName || "Google User";
      const email = user.email;

      if (!email) {
        throw new Error("Google account did not return an email");
      }

      const result = await axios.post(
        getApiUrl('/auth/google'),
        { name, email },
        { withCredentials: true }
      );

      if (result.data?.success) {
        login(
          result.data.token,
          result.data.user.role,
          result.data.user.name
        );
      } else {
        throw new Error(result.data?.message || "Google sign-in failed");
      }
     }catch(error){
       console.error("Google auth failed:", error);
       if (onError) {
        onError(error.response?.data?.message || error.message || "Google sign-in failed");
       }
     }
    }

    return(
        <>
        <button onClick={handleGoogleAuth} type="button" className="google-btn">
                                   <FcGoogle size={22} />
                                   <span>Continue with Google</span>
        </button>
        </>
    )
}

export default Auth;