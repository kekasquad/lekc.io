import { useState } from 'react';

export default function useToken() {
    const getToken = () => {
      const tokenString = localStorage.getItem('token');
      if (tokenString === null) {
          return "";
      }
      return tokenString
    };
    const [token, setToken] = useState(getToken());

    const saveToken = (userToken: any) => {
        localStorage.setItem('token', userToken);
        setToken(userToken);
    };
    
    return {
        setToken: saveToken,
        token
    };
}