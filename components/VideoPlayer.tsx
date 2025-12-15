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

  // Don't render if we have an invalid URL like 'untitled.mp4'
  if (!processedSrc || processedSrc.includes('untitled.mp4')) {
    return (
      <div className={`relative w-full max-w-xl mx-auto ${className}`}>
        <div className="relative w-full pb-[56.25%] bg-slate-100 rounded-lg shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center">
          <div className="text-center text-slate-500">
            <div className="w-12 h-12 mx-auto mb-2 opacity-50">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-sm">Video not available</p>
          </div>
        </div>
      </div>
    );
  }

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