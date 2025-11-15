import React, { useState, useEffect } from "react";
import { SceneType } from "../App";

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null;
  return null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

interface SignInSceneProps {
  onSceneChange: (scene: SceneType) => void;
}

export const SignInScene: React.FC<SignInSceneProps> = ({ onSceneChange }) => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Try loading username from cookie on mount
    const savedUsername = getCookie("username");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      // Store username in cookie
      setCookie("username", username, 365);
      onSceneChange("tank-selection");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          marginBottom: "40px",
          fontWeight: "bold",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        SIGN IN
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          style={{
            padding: "12px 20px",
            fontSize: "18px",
            borderRadius: "8px",
            border: "2px solid #4a90e2",
            backgroundColor: "#2a2a2a",
            color: "#ffffff",
            minWidth: "300px",
            fontFamily: "Poppins, sans-serif",
          }}
          autoFocus
        />
        <button
          type="submit"
          style={{
            padding: "12px 40px",
            fontSize: "20px",
            fontWeight: "bold",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#4a90e2",
            color: "#ffffff",
            cursor: "pointer",
            transition: "background-color 0.2s",
            fontFamily: "Poppins, sans-serif",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#5aa0f2")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#4a90e2")
          }
        >
          START
        </button>
      </form>
    </div>
  );
};
