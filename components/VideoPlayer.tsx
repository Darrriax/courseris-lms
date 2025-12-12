import React from 'react';
import { getAssetUrl } from '../utils/assetHelpers';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = ''
}) => {
  // Process the src URL to handle relative paths and blob URLs
  const processedSrc = getAssetUrl(src);
  const processedPoster = poster ? getAssetUrl(poster) : undefined;

  return (
    <div className={`relative w-full max-w-xl mx-auto ${className}`}>
      {/* Fixed 16:9 aspect ratio container */}
      <div className="relative w-full pb-[56.25%] bg-slate-100 rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <video
          controls
          className="absolute top-0 left-0 w-full h-full object-contain"
          poster={processedPoster}
          preload="metadata"
        >
          <source src={processedSrc} type="video/mp4" />
          <source src={processedSrc} type="video/webm" />
          <source src={processedSrc} type="video/ogg" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};