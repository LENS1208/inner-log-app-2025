import React, { useState } from 'react';

type StarRatingProps = {
  rating: number | null;
  onChange: (rating: number) => void;
  readOnly?: boolean;
  showLabel?: boolean;
};

export default function StarRating({ rating, onChange, readOnly = false, showLabel = true }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleClick = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!readOnly) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      const newRating = isHalf ? star - 0.5 : star;
      onChange(newRating);
    }
  };

  const handleMouseMove = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!readOnly) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isHalf = x < rect.width / 2;
      const newRating = isHalf ? star - 0.5 : star;
      setHoverRating(newRating);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  const displayRating = hoverRating !== null ? hoverRating : (rating || 0);

  const renderStar = (star: number) => {
    const filled = displayRating >= star;
    const halfFilled = displayRating >= star - 0.5 && displayRating < star;

    return (
      <button
        key={star}
        onClick={(e) => handleClick(star, e)}
        onMouseMove={(e) => handleMouseMove(star, e)}
        disabled={readOnly}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: readOnly ? 'default' : 'pointer',
          fontSize: 18,
          lineHeight: 1,
          position: 'relative',
          transition: 'opacity 0.15s',
        }}
        aria-label={`${star}つ星`}
      >
        <span style={{ color: '#d1d5db' }}>★</span>
        {halfFilled && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '50%',
              overflow: 'hidden',
              color: '#fbbf24',
            }}
          >
            ★
          </span>
        )}
        {filled && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              color: '#fbbf24',
            }}
          >
            ★
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {showLabel && (
        <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginRight: 4 }}>
          あなたの評価
        </span>
      )}
      <div
        style={{ display: 'flex', gap: 2 }}
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => renderStar(star))}
      </div>
      {rating && (
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
          {rating.toFixed(1)}/5.0
        </span>
      )}
    </div>
  );
}
