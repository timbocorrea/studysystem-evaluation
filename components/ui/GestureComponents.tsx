import React from 'react';

export const SwipeToDelete: React.FC<any> = ({ children }) => {
    return <>{children}</>;
};

export const SwipeToAction: React.FC<any> = ({ children }) => {
    return <div className="relative overflow-hidden">{children}</div>;
};

export const LongPressMenu: React.FC<any> = ({ children }) => {
    return <>{children}</>;
};

export const PinchToZoom: React.FC<any> = ({ children }) => {
    return <div className="touch-none overflow-hidden">{children}</div>;
};

export default {
    SwipeToDelete,
    SwipeToAction,
    LongPressMenu,
    PinchToZoom
};

