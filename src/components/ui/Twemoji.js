import React from 'react';

const Twemoji = ({ hex, size = 48, alt = '' }) => {
    if (!hex) return null;
    return (
        <img
            src={`/twemoji/svg/${hex}.svg`}
            alt={alt}
            width={size}
            height={size}
            style={{ display: 'block' }}
            draggable="false"
        />
    );
};

export default Twemoji;
