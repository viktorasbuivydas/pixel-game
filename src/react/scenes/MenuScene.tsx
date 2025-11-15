import React, { useState, useEffect } from "react";
import { SceneType } from "../App";

interface MenuSceneProps {
  onSceneChange: (scene: SceneType) => void;
}

export const MenuScene: React.FC<MenuSceneProps> = ({ onSceneChange }) => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username") || "";
    setUsername(storedUsername);
  }, []);

  const handleUsernameChange = () => {
    const newUsername = prompt("Enter new username:", username);
    if (newUsername !== null && newUsername.trim()) {
      setUsername(newUsername);
      localStorage.setItem("username", newUsername);
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
        gap: "40px",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        MENIU
      </h1>

      <button
        onClick={handleUsernameChange}
        style={{
          padding: "12px 40px",
          fontSize: "20px",
          borderRadius: "8px",
          border: "2px solid #ffffff",
          backgroundColor: "#4a90e2",
          color: "#ffffff",
          cursor: "pointer",
          minWidth: "260px",
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
        Vardas: {username || "Nenustatytas"}
      </button>

      <button
        onClick={() => onSceneChange("game")}
        style={{
          padding: "12px 40px",
          fontSize: "20px",
          borderRadius: "8px",
          border: "2px solid #ffffff",
          backgroundColor: "#666666",
          color: "#ffffff",
          cursor: "pointer",
          minWidth: "260px",
          transition: "background-color 0.2s",
          fontFamily: "Poppins, sans-serif",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#777777")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#666666")
        }
      >
        Grįžti atgal
      </button>
    </div>
  );
};
