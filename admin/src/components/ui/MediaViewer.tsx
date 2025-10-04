import React, { useState } from 'react';
import { Carousel, Button } from 'react-bootstrap';
import { 
  CaretLeft, 
  CaretRight, 
  ArrowSquareOut,
  FileImage,
  PlayCircle,
  Warning
} from 'phosphor-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'unknown';
}

interface MediaViewerProps {
  media: string[];
  height?: string | number;
  className?: string;
  showExternalLink?: boolean;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  media = [],
  height = 400,
  className = '',
  showExternalLink = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());

  // Determine media type based on URL extension
  const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
    if (!url) return 'unknown';
    
    const lowercaseUrl = url.toLowerCase();
    
    if (lowercaseUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/)) {
      return 'image';
    }
    
    if (lowercaseUrl.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv)(\?.*)?$/)) {
      return 'video';
    }
    
    return 'unknown';
  };

  const mediaItems: MediaItem[] = media.map(url => ({
    url,
    type: getMediaType(url)
  }));

  const handleLoadError = (url: string) => {
    setLoadErrors(prev => new Set([...prev, url]));
  };

  const renderMediaItem = (item: MediaItem, index: number) => {
    if (loadErrors.has(item.url)) {
      return (
        <div 
          className="d-flex flex-column align-items-center justify-content-center bg-light text-muted"
          style={{ height }}
        >
          <Warning size={48} className="mb-2" />
          <div className="fw-medium">Failed to load media</div>
          <small>The media file could not be displayed</small>
        </div>
      );
    }

    switch (item.type) {
      case 'image':
        return (
          <div className="position-relative">
            <img
              src={item.url}
              alt={`Media ${index + 1}`}
              className="w-100"
              style={{ 
                height, 
                objectFit: 'contain',
                backgroundColor: '#f8f9fa'
              }}
              onError={() => handleLoadError(item.url)}
              onLoad={() => {
                // Remove from error set if it loads successfully after retry
                setLoadErrors(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(item.url);
                  return newSet;
                });
              }}
            />
            {showExternalLink && (
              <Button
                variant="outline-light"
                size="sm"
                className="position-absolute top-0 end-0 m-2"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
              >
                <ArrowSquareOut size={14} />
              </Button>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div className="position-relative">
            <video
              src={item.url}
              controls
              playsInline
              className="w-100"
              style={{ 
                height, 
                backgroundColor: '#000'
              }}
              onError={() => handleLoadError(item.url)}
            >
              Your browser does not support the video tag.
            </video>
            {showExternalLink && (
              <Button
                variant="outline-light"
                size="sm"
                className="position-absolute top-0 end-0 m-2"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
              >
                <ArrowSquareOut size={14} />
              </Button>
            )}
          </div>
        );
      
      default:
        return (
          <div 
            className="d-flex flex-column align-items-center justify-content-center bg-light text-muted"
            style={{ height }}
          >
            <FileImage size={48} className="mb-2" />
            <div className="fw-medium">Unsupported media type</div>
            <small className="mb-3">Cannot preview this file</small>
            {showExternalLink && (
              <Button
                variant="outline-primary"
                size="sm"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center gap-1"
              >
                <ArrowSquareOut size={14} />
                Open in new tab
              </Button>
            )}
          </div>
        );
    }
  };

  // No media provided
  if (mediaItems.length === 0) {
    return (
      <div 
        className={`d-flex flex-column align-items-center justify-content-center bg-light text-muted rounded ${className}`}
        style={{ height }}
      >
        <FileImage size={48} className="mb-2" style={{ opacity: 0.3 }} />
        <div className="fw-medium">No media available</div>
        <small>No images or videos to display</small>
      </div>
    );
  }

  // Single media item
  if (mediaItems.length === 1) {
    return (
      <div className={`rounded overflow-hidden ${className}`}>
        {renderMediaItem(mediaItems[0], 0)}
      </div>
    );
  }

  // Multiple media items - use carousel
  return (
    <div className={`rounded overflow-hidden position-relative ${className}`}>
      <Carousel
        activeIndex={currentIndex}
        onSelect={(selectedIndex) => setCurrentIndex(selectedIndex)}
        controls={false}
        indicators={false}
        interval={null}
        className="h-100"
      >
        {mediaItems.map((item, index) => (
          <Carousel.Item key={index} className="h-100">
            {renderMediaItem(item, index)}
          </Carousel.Item>
        ))}
      </Carousel>

      {/* Custom Navigation Controls */}
      {mediaItems.length > 1 && (
        <>
          <Button
            variant="outline-light"
            className="position-absolute top-50 start-0 translate-middle-y ms-2"
            style={{ zIndex: 10 }}
            onClick={() => setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : mediaItems.length - 1)}
            title="Previous media"
          >
            <CaretLeft size={20} weight="bold" />
          </Button>
          
          <Button
            variant="outline-light"
            className="position-absolute top-50 end-0 translate-middle-y me-2"
            style={{ zIndex: 10 }}
            onClick={() => setCurrentIndex(currentIndex < mediaItems.length - 1 ? currentIndex + 1 : 0)}
            title="Next media"
          >
            <CaretRight size={20} weight="bold" />
          </Button>

          {/* Media Counter */}
          <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2">
            <span className="badge bg-dark bg-opacity-75 px-2 py-1">
              {currentIndex + 1} / {mediaItems.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default MediaViewer;
