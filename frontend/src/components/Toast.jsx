import { useEffect, useState } from 'react';
import './Toast.css';

export function Toast({ message, type = 'info', duration = 3000, onClose }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onClose?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!visible) return null;

    return (
        <div className={`toast toast-${type}`} onClick={() => {
            setVisible(false);
            onClose?.();
        }}>
            {message}
        </div>
    );
}

export function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts(current => [...current, { id, message, type, duration }]);
        return id;
    };

    const removeToast = (id) => {
        setToasts(current => current.filter(toast => toast.id !== id));
    };

    const ToastContainer = () => (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );

    return {
        addToast,
        removeToast,
        ToastContainer
    };
}