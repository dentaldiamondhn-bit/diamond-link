'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OdontogramTestService } from '@/services/odontogramTestService';

// Tooth states for testing
const TOOTH_STATES = [
  { key: 'sano', label: 'Sano', color: '#FFFFFF' },
  { key: 'caries', label: 'Caries', color: '#FF0000' },
  { key: 'restauracion', label: 'Restauración', color: '#4CAF50' },
  { key: 'extraccion', label: 'Extracción', color: '#9E9E9E' },
  { key: 'endodoncia', label: 'Endodoncia', color: '#00BCD4' },
  { key: 'protesis', label: 'Prótesis', color: '#FFC107' },
  { key: 'implante', label: 'Implante', color: '#009688' },
];

// Tooth numbering for adult dentition
const ADULT_TEETH = {
  upper: [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28]
  ],
  lower: [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38]
  ]
};

interface ToothSection {
  section: number; // 1-5
  state: string;
}

interface ToothData {
  [key: number]: {
    sections: ToothSection[];
  };
}

export default function OdontogramTestPage() {
  const router = useRouter();
  const [testName, setTestName] = useState('Test Odontogram');
  const [selectedState, setSelectedState] = useState('sano');
  const [teethData, setTeethData] = useState<ToothData>({});
  const [savedTests, setSavedTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize empty teeth data
  const initializeEmptyTeeth = () => {
    const data: ToothData = {};
    [...ADULT_TEETH.upper.flat(), ...ADULT_TEETH.lower.flat()].forEach(toothNumber => {
      data[toothNumber] = {
        sections: [
          { section: 1, state: 'sano' },
          { section: 2, state: 'sano' },
          { section: 3, state: 'sano' },
          { section: 4, state: 'sano' },
          { section: 5, state: 'sano' }
        ]
      };
    });
    setTeethData(data);
  };

  useEffect(() => {
    initializeEmptyTeeth();
    loadSavedTests();
  }, []);

  // Load saved tests
  const loadSavedTests = async () => {
    try {
      const tests = await OdontogramTestService.getAllTests();
      setSavedTests(tests);
    } catch (error) {
      console.error('Error loading saved tests:', error);
    }
  };

  // Handle tooth section click
  const handleSectionClick = (toothNumber: number, section: number) => {
    setTeethData(prev => ({
      ...prev,
      [toothNumber]: {
        sections: prev[toothNumber]?.sections.map(s => 
          s.section === section ? { ...s, state: selectedState } : s
        ) || [
          { section: 1, state: 'sano' },
          { section: 2, state: 'sano' },
          { section: 3, state: 'sano' },
          { section: 4, state: 'sano' },
          { section: 5, state: 'sano' }
        ]
      }
    }));
  };

  // Save test odontogram
  const saveTest = async () => {
    setLoading(true);
    try {
      await OdontogramTestService.saveTest(testName, teethData);
      alert('Test odontogram saved successfully!');
      await loadSavedTests(); // Reload the list
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Error saving test odontogram');
    } finally {
      setLoading(false);
    }
  };

  // Render circle tooth with 5 sections
  const renderCircleTooth = (toothNumber: number) => {
    const tooth = teethData[toothNumber];
    const sections = tooth?.sections || [];
    
    return (
      <div className="relative w-12 h-12 mx-1">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Section 1 - Top */}
          <path
            d="M 50 10 L 75 25 L 50 40 Z"
            fill={sections.find(s => s.section === 1)?.state === 'sano' ? '#f3f4f6' : 
                  TOOTH_STATES.find(state => state.key === sections.find(s => s.section === 1)?.state)?.color || '#000000'}
            stroke="#374151"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSectionClick(toothNumber, 1)}
          />
          
          {/* Section 2 - Top Right */}
          <path
            d="M 50 40 L 75 25 L 90 50 L 75 75 Z"
            fill={sections.find(s => s.section === 2)?.state === 'sano' ? '#f3f4f6' : 
                  TOOTH_STATES.find(state => state.key === sections.find(s => s.section === 2)?.state)?.color || '#000000'}
            stroke="#374151"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSectionClick(toothNumber, 2)}
          />
          
          {/* Section 3 - Bottom Right */}
          <path
            d="M 50 60 L 75 75 L 90 50 L 75 25 Z"
            fill={sections.find(s => s.section === 3)?.state === 'sano' ? '#f3f4f6' : 
                  TOOTH_STATES.find(state => state.key === sections.find(s => s.section === 3)?.state)?.color || '#000000'}
            stroke="#374151"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSectionClick(toothNumber, 3)}
          />
          
          {/* Section 4 - Bottom */}
          <path
            d="M 50 90 L 75 75 L 50 60 Z"
            fill={sections.find(s => s.section === 4)?.state === 'sano' ? '#f3f4f6' : 
                  TOOTH_STATES.find(state => state.key === sections.find(s => s.section === 4)?.state)?.color || '#000000'}
            stroke="#374151"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSectionClick(toothNumber, 4)}
          />
          
          {/* Section 5 - Left */}
          <path
            d="M 10 50 L 75 25 L 50 40 L 50 60 L 75 75 Z"
            fill={sections.find(s => s.section === 5)?.state === 'sano' ? '#f3f4f6' : 
                  TOOTH_STATES.find(state => state.key === sections.find(s => s.section === 5)?.state)?.color || '#000000'}
            stroke="#374151"
            strokeWidth="1"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSectionClick(toothNumber, 5)}
          />
          
          {/* Center circle */}
          <circle
            cx="50"
            cy="50"
            r="15"
            fill="white"
            stroke="#374151"
            strokeWidth="2"
          />
          
          {/* Tooth number */}
          <text
            x="50"
            y="55"
            textAnchor="middle"
            fontSize="12"
            fill="#374151"
            className="pointer-events-none"
          >
            {toothNumber}
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Odontogram Testing Page</h1>
            <button
              onClick={() => router.push('/menu-navegacion')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back to Menu
            </button>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Name:
            </label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter test name..."
            />
          </div>
        </div>

        {/* State Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select State</h2>
          <div className="grid grid-cols-4 gap-4">
            {TOOTH_STATES.map(state => (
              <button
                key={state.key}
                onClick={() => setSelectedState(state.key)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedState === state.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className="w-6 h-6 rounded mr-2"
                    style={{ backgroundColor: state.color }}
                  ></div>
                  <span className="text-sm font-medium">{state.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Odontogram */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Circle Tooth Odontogram</h2>
          
          {/* Upper Teeth */}
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              {ADULT_TEETH.upper[0].reverse().map(tooth => renderCircleTooth(tooth))}
            </div>
            <div className="flex justify-center">
              {ADULT_TEETH.upper[1].map(tooth => renderCircleTooth(tooth))}
            </div>
          </div>

          {/* Lower Teeth */}
          <div>
            <div className="flex justify-center mb-4">
              {ADULT_TEETH.lower[0].map(tooth => renderCircleTooth(tooth))}
            </div>
            <div className="flex justify-center">
              {ADULT_TEETH.lower[1].reverse().map(tooth => renderCircleTooth(tooth))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={initializeEmptyTeeth}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Clear All
            </button>
            
            <button
              onClick={saveTest}
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Test'}
            </button>
          </div>
        </div>

        {/* Saved Tests */}
        {savedTests.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Saved Tests</h2>
            <div className="grid grid-cols-3 gap-4">
              {savedTests.map(test => (
                <div key={test.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">{test.test_name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(test.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
