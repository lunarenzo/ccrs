import React from 'react';
import { Row, Col, Form, Badge } from 'react-bootstrap';
import { Calendar, Play, Pause, SkipBack, SkipForward } from 'phosphor-react';

interface TimeSliderProps {
  timeRange: {
    start: Date;
    end: Date;
    current: Date;
  };
  onTimeChange: (date: Date) => void;
  onRangeChange: (start: Date, end: Date) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  reportCounts: { [key: string]: number };
}

const TimeSlider: React.FC<TimeSliderProps> = ({
  timeRange,
  onTimeChange,
  onRangeChange,
  isPlaying,
  onPlayToggle,
  playbackSpeed,
  onSpeedChange,
  reportCounts
}) => {
  // Convert date to slider value (days since start)
  const dateToValue = (date: Date) => {
    const timeDiff = date.getTime() - timeRange.start.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  };

  // Convert slider value to date
  const valueToDate = (value: number) => {
    return new Date(timeRange.start.getTime() + (value * 24 * 60 * 60 * 1000));
  };

  const maxValue = dateToValue(timeRange.end);
  const currentValue = dateToValue(timeRange.current);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCurrentDateKey = () => {
    return timeRange.current.toISOString().split('T')[0];
  };

  const currentReportCount = reportCounts[getCurrentDateKey()] || 0;

  // Navigation functions
  const goToPreviousDay = () => {
    if (currentValue > 0) {
      onTimeChange(valueToDate(currentValue - 1));
    }
  };

  const goToNextDay = () => {
    if (currentValue < maxValue) {
      onTimeChange(valueToDate(currentValue + 1));
    }
  };

  return (
    <div className="time-slider-container bg-light border rounded p-3 mb-3">
      <Row className="align-items-center g-3">
        {/* Time Controls */}
        <Col xs={12} md={2}>
          <div className="d-flex align-items-center gap-2 justify-content-center justify-content-md-start">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={goToPreviousDay}
              disabled={currentValue <= 0}
              title="Previous day"
            >
              <SkipBack size={14} weight="fill" />
            </button>
            
            <button
              className="btn btn-primary btn-sm"
              onClick={onPlayToggle}
              title={isPlaying ? 'Pause' : 'Play timeline'}
            >
              {isPlaying ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
            </button>
            
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={goToNextDay}
              disabled={currentValue >= maxValue}
              title="Next day"
            >
              <SkipForward size={14} weight="fill" />
            </button>
          </div>
        </Col>

        {/* Time Slider */}
        <Col xs={12} md={6}>
          <div className="d-flex flex-column gap-2">
            <Form.Range
              min={0}
              max={maxValue}
              step={1}
              value={currentValue}
              onChange={(e) => onTimeChange(valueToDate(parseInt(e.target.value)))}
              className="time-range-slider"
            />
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">{formatDate(timeRange.start)}</small>
              <div className="text-center">
                <div className="d-flex align-items-center gap-2 justify-content-center">
                  <Calendar size={16} className="text-primary" />
                  <strong className="text-primary">{formatDate(timeRange.current)}</strong>
                  {currentReportCount > 0 && (
                    <Badge bg="primary">{currentReportCount} reports</Badge>
                  )}
                </div>
              </div>
              <small className="text-muted">{formatDate(timeRange.end)}</small>
            </div>
          </div>
        </Col>

        {/* Speed Control */}
        <Col xs={12} md={2}>
          <div className="d-flex flex-column gap-1">
            <small className="text-muted text-center">Speed</small>
            <Form.Select
              size="sm"
              value={playbackSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </Form.Select>
          </div>
        </Col>

        {/* Range Selectors */}
        <Col xs={12} md={2}>
          <div className="d-flex flex-column gap-1">
            <small className="text-muted text-center">Quick Range</small>
            <div className="d-flex gap-1">
              <button
                className="btn btn-outline-secondary btn-sm flex-fill"
                onClick={() => {
                  const end = new Date();
                  const start = new Date(end);
                  start.setDate(end.getDate() - 7);
                  onRangeChange(start, end);
                }}
              >
                7d
              </button>
              <button
                className="btn btn-outline-secondary btn-sm flex-fill"
                onClick={() => {
                  const end = new Date();
                  const start = new Date(end);
                  start.setDate(end.getDate() - 30);
                  onRangeChange(start, end);
                }}
              >
                30d
              </button>
              <button
                className="btn btn-outline-secondary btn-sm flex-fill"
                onClick={() => {
                  const end = new Date();
                  const start = new Date(end);
                  start.setDate(end.getDate() - 90);
                  onRangeChange(start, end);
                }}
              >
                90d
              </button>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default TimeSlider;
