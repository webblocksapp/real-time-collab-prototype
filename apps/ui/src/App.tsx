import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface CursorPosition {
  x: number;
  y: number;
}

interface UserCursors {
  [key: string]: CursorPosition;
}

export const App: React.FC = () => {
  const [cursors, setCursors] = useState<UserCursors>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on(
      'updateCursorPosition',
      (data: { id: string; x: number; y: number }) => {
        setCursors((prevCursors) => ({
          ...prevCursors,
          [data.id]: { x: data.x, y: data.y },
        }));
      }
    );

    newSocket.on('userDisconnected', (id: string) => {
      setCursors((prevCursors) => {
        const { [id]: _, ...rest } = prevCursors;
        return rest;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (socket) {
        socket.emit('cursorPosition', { x: event.clientX, y: event.clientY });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [socket]);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {Object.entries(cursors).map(([id, cursor]) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: cursor.x,
            top: cursor.y,
            width: '10px',
            height: '10px',
            backgroundColor: 'red',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};
