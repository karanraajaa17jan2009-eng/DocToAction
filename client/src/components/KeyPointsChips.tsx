import React, { useState } from 'react';
import { CheckCircle2, AlertOctagon, Calendar } from 'lucide-react';

interface KeyPoints {
  eligibility: string[];
  obligations: string[];
  deadlines: string[];
}

interface KeyPointsChipsProps {
  keyPoints: KeyPoints;
  translatedKeyPoints?: KeyPoints;
  isTamil?: boolean;
}

export const KeyPointsChips: React.FC<KeyPointsChipsProps> = ({
  keyPoints,
  translatedKeyPoints,
  isTamil = false
}) => {
  const [activeTab, setActiveTab] = useState<'eligibility' | 'obligations' | 'deadlines'>('eligibility');

  const currentData = isTamil && translatedKeyPoints ? translatedKeyPoints : keyPoints;
  const activeItems = currentData[activeTab] || [];

  return (
    <div className="keypoints-container">
      <div className="chips-nav">
        <button
          className={`chip-btn ${activeTab === 'eligibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('eligibility')}
        >
          <CheckCircle2 size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {isTamil ? 'தகுதி வரம்புகள்' : 'Eligibility'} ({currentData.eligibility?.length || 0})
        </button>

        <button
          className={`chip-btn ${activeTab === 'obligations' ? 'active' : ''}`}
          onClick={() => setActiveTab('obligations')}
        >
          <AlertOctagon size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {isTamil ? 'கடமைகள் & கட்டுப்பாடுகள்' : 'Obligations'} ({currentData.obligations?.length || 0})
        </button>

        <button
          className={`chip-btn ${activeTab === 'deadlines' ? 'active' : ''}`}
          onClick={() => setActiveTab('deadlines')}
        >
          <Calendar size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {isTamil ? 'காலக்கெடு & தேதிகள்' : 'Deadlines'} ({currentData.deadlines?.length || 0})
        </button>
      </div>

      <div className="chip-items-list" key={`${activeTab}-${isTamil}`}>
        {activeItems.length > 0 ? (
          activeItems.map((item, idx) => (
            <div key={idx} className="chip-item-card">
              {item}
            </div>
          ))
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', fontStyle: 'italic', padding: 12 }}>
            {isTamil
              ? 'இந்த பிரிவில் குறிப்பிடப்பட்ட குறிப்புகள் இல்லை.'
              : 'No specific criteria explicitly highlighted in this category.'}
          </div>
        )}
      </div>
    </div>
  );
};
