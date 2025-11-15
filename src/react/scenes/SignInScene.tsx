import React, { useState } from "react";
import { SceneType } from "../App";

interface SignInSceneProps {
  onSceneChange: (scene: SceneType) => void;
}

export const SignInScene: React.FC<SignInSceneProps> = ({ onSceneChange }) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      // Store username in cookie or state
      localStorage.setItem("username", username);
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
        style={{ fontSize: "48px", marginBottom: "40px", fontWeight: "bold" }}
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
