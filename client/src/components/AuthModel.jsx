import React from "react";
import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import Auth from "./pages/Auth";
import { useAuth } from "../context/AuthContext.jsx";

function AuthModel({onClose}){
  const { isAuthenticated } = useAuth();

    useEffect(() => {
    if(isAuthenticated){
            onClose()
        }
  } , [isAuthenticated , onClose])

   return(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/10 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md">
        <button onClick={onClose} className="absolute top-8 right-5 text-gray-800 hover:text-black text-xl"><FaTimes size={18}/></button>
        <Auth />
      </div>
    </div>
 )
}

export default AuthModel;