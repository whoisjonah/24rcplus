import { useState } from 'react';

interface PasswordScreenProps {
    onAuthenticated: () => void;
}

export default function PasswordScreen({ onAuthenticated }: PasswordScreenProps) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string) || "";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            onAuthenticated();
        } else {
            setError("Invalid password");
            setPassword("");
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '40px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}>
                <h1 style={{
                    textAlign: 'center',
                    color: '#fff',
                    marginBottom: '30px',
                    fontSize: '24px'
                }}>
                    24RC ATC
                </h1>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                        }}
                        placeholder="Enter password"
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: '#1a1a1a',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '16px',
                            boxSizing: 'border-box',
                            marginBottom: error ? '10px' : '20px'
                        }}
                        autoFocus
                    />
                    {error && (
                        <div style={{
                            color: '#ff4444',
                            marginBottom: '20px',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#00aa00',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#000',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#00cc00')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '#00aa00')}
                    >
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
}
