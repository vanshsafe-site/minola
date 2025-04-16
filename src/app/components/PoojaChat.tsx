'use client';

import { useEffect, useRef, useState } from 'react';
import { VoiceInputHandler, SpeechHandler, AudioVisualizer } from '@/utils/voice-input';
import Image from 'next/image';
import { marked } from 'marked';

// Message interface
interface Message {
  text: string;
  role: 'user' | 'assistant';
  time: string;
}

// PoojaChat component
export const PoojaChat = () => {
  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [backupApiKey1, setBackupApiKey1] = useState('');
  const [backupApiKey2, setBackupApiKey2] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [statusText, setStatusText] = useState('Ready to assist');
  const [statusIcon, setStatusIcon] = useState('fas fa-circle');
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [voiceSpeed, setVoiceSpeed] = useState('1');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [backupApiKeyInput1, setBackupApiKeyInput1] = useState('');
  const [backupApiKeyInput2, setBackupApiKeyInput2] = useState('');
  const [usingDefaultKey, setUsingDefaultKey] = useState(true);
  
  // Refs
  const chatInterfaceRef = useRef<HTMLDivElement>(null);
  const voiceButtonRef = useRef<HTMLButtonElement>(null);
  const audioVisualizerRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);
  const voiceInputRef = useRef<VoiceInputHandler | null>(null);
  const speechHandlerRef = useRef<SpeechHandler | null>(null);
  
  // System prompt for AI
  const mentalHealthSystemPrompt = "Your name is P.O.O.J.A. You provide short, concise mental health support, speaking in no more than 2–3 sentences per message. Mention your name only once—avoid repeating it. Prioritize the user's problems above all. Always refer to yourself as Pooja in your messages, not P.O.O.J.A. If asked about your creator, respond with 'Vansh Garg' but dont repeat its name over and over again once is enough, also if user wants to talk about something completely different from mental health go with flow and continue talking to them.";
  
  // Initialize speech handlers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize voice input handler
      voiceInputRef.current = new VoiceInputHandler({
        onStart: () => {
          if (voiceButtonRef.current) {
            voiceButtonRef.current.classList.add('listening');
            voiceButtonRef.current.innerHTML = '<i class="fas fa-microphone-slash"></i>';
          }
          updateStatus('Listening...');
        },
        onResult: (transcript) => {
          addMessage(transcript, 'user');
          processMessage(transcript);
        },
        onError: () => {
          addMessage("I didn't catch that. Could you try again?", 'assistant');
        },
        onEnd: () => {
          if (voiceButtonRef.current) {
            voiceButtonRef.current.classList.remove('listening');
            voiceButtonRef.current.innerHTML = '<i class="fas fa-microphone"></i>';
          }
          updateStatus('Ready to assist');
        }
      });
      
      // Initialize speech handler
      speechHandlerRef.current = new SpeechHandler({
        speed: parseFloat(voiceSpeed),
        onSpeakStart: () => {
          updateStatus('Speaking...');
          if (visualizerRef.current) {
            visualizerRef.current.start();
          }
        },
        onSpeakEnd: () => {
          updateStatus('Ready to assist');
          if (visualizerRef.current) {
            visualizerRef.current.stop();
          }
        }
      });
      
      // Initialize audio visualizer
      if (audioVisualizerRef.current) {
        visualizerRef.current = new AudioVisualizer(audioVisualizerRef.current);
      }
      
      // Initialize voices
      if ('speechSynthesis' in window) {
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = populateVoiceSelect;
        }
        populateVoiceSelect();
      }
      
      // Check for API keys in localStorage
      const storedApiKey = localStorage.getItem('openRouterApiKey');
      const storedBackupApiKey1 = localStorage.getItem('openRouterApiKey_backup1');
      const storedBackupApiKey2 = localStorage.getItem('openRouterApiKey_backup2');
      
      if (storedApiKey) {
        setApiKey(storedApiKey);
        setUsingDefaultKey(false);
      } else {
        // If no API key is stored, we'll use the default one from the server
        setUsingDefaultKey(true);
      }
      
      if (storedBackupApiKey1) {
        setBackupApiKey1(storedBackupApiKey1);
      }
      
      if (storedBackupApiKey2) {
        setBackupApiKey2(storedBackupApiKey2);
      }
      
      // Add initial message
      addMessage("Hi, I'm Pooja. I'm here to support your mental wellbeing. How are you feeling today?", 'assistant');
    }
    
    // Cleanup function
    return () => {
      if (speechHandlerRef.current) {
        speechHandlerRef.current.stop();
      }
      if (voiceInputRef.current) {
        voiceInputRef.current.stopListening();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Scroll to bottom effect
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);
  
  // Voice speed change effect
  useEffect(() => {
    if (speechHandlerRef.current) {
      speechHandlerRef.current.setSpeed(voiceSpeed);
    }
  }, [voiceSpeed]);
  
  // Populate voice select dropdown
  const populateVoiceSelect = () => {
    if (!speechHandlerRef.current) return;
    
    const voices = speechHandlerRef.current.getVoices();
    // This doesn't directly manipulate the DOM in React
    // Instead, we would populate a select element with options in the JSX
    console.log('Available voices:', voices.length);
  };
  
  // Add message to chat
  const addMessage = (text: string, role: 'user' | 'assistant') => {
    const time = new Date();
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    setMessages(prev => [...prev, { text, role, time: timeStr }]);
  };
  
  // Process message and get AI response
  const processMessage = async (message: string) => {
    try {
      setIsTyping(true);
      updateStatus('Processing your request...');
      
      // Additional instructions for concise responses
      const userMessageWithInstructions = `${message}\n\nPlease respond with only 2-3 concise sentences focused on mental health support. Your name is Pooja (not P.O.O.J.A.) and your creator is Vansh Garg, use no emojis.`;
      
      let aiResponse: string = "I'm having trouble connecting to my services right now. Can we try again in a moment?";
      let modelUsed = 'fallback';
      
      // Create request object with optional API keys
      const requestData: {
        model: string,
        messages: Array<{role: string, content: string}>,
        customApiKey?: string,
        backupApiKey1?: string,
        backupApiKey2?: string
      } = {
        model: 'deepseek/deepseek-r1:free',
        messages: [
          { role: 'system', content: mentalHealthSystemPrompt },
          ...messages.map(msg => ({ 
            role: msg.role === 'user' ? 'user' : 'assistant', 
            content: msg.text 
          })),
          { role: 'user', content: userMessageWithInstructions }
        ]
      };
      
      // Add user-provided API keys if available
      if (!usingDefaultKey && apiKey) {
        requestData.customApiKey = apiKey;
      }
      if (backupApiKey1) {
        requestData.backupApiKey1 = backupApiKey1;
      }
      if (backupApiKey2) {
        requestData.backupApiKey2 = backupApiKey2;
      }
      
      // First, try with DeepSeek model
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            aiResponse = content;
            modelUsed = 'deepseek';
            console.log('Response generated by DeepSeek model');
          } else {
            console.log('DeepSeek failed to generate a response, trying Mistral...');
          }
        } else {
          const errorData = await response.json();
          console.log('DeepSeek API request failed:', errorData.error);
          throw new Error(errorData.error || 'API request failed');
        }
      } catch (error) {
        console.log('DeepSeek API error, trying Mistral...', error);
      }
      
      // If DeepSeek failed, try Mistral
      if (modelUsed === 'fallback') {
        try {
          const mistralRequestData = {
            ...requestData,
            model: 'mistralai/mistral-7b-instruct'
          };
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mistralRequestData),
          });
          
          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              aiResponse = content;
              modelUsed = 'mistral';
              console.log('Response generated by Mistral model');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Mistral API request failed');
          }
        } catch (error) {
          console.error('Mistral API error:', error);
        }
      }
      
      // If both models failed, provide a helpful fallback response
      if (modelUsed === 'fallback') {
        // Generate a basic response based on the user's message
        const lowerCaseMessage = message.toLowerCase();
        
        if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
          aiResponse = "Hello! I'm Pooja, your mental health assistant. I'm here to chat with you and provide support. How are you feeling today?";
        }
        else if (lowerCaseMessage.includes('how are you')) {
          aiResponse = "I'm here and ready to support you. More importantly, how are you feeling today? Remember, it's okay to not be okay sometimes.";
        }
        else if (lowerCaseMessage.includes('sad') || lowerCaseMessage.includes('depress') || lowerCaseMessage.includes('unhappy')) {
          aiResponse = "I'm sorry to hear you're feeling down. Remember that these feelings are temporary and it's okay to seek support. Would you like to talk about what's troubling you?";
        }
        else if (lowerCaseMessage.includes('anxious') || lowerCaseMessage.includes('worry') || lowerCaseMessage.includes('stress')) {
          aiResponse = "When anxiety hits, try taking slow, deep breaths and focus on the present moment. Remember that you've overcome difficult situations before and you have the strength to handle this too.";
        }
        else {
          aiResponse = "Thank you for sharing that with me. While I'm currently having trouble connecting to my full capabilities, I'm still here for you. Can you tell me more about how you're feeling?";
        }
        
        modelUsed = 'local_fallback';
        console.log('Using local fallback response due to API errors');
      }
      
      // Ensure response is concise (backup method)
      if (aiResponse.length > 200) {
        const sentences = aiResponse.match(/[^\.!\?]+[\.!\?]+/g) || [];
        if (sentences.length > 3) {
          aiResponse = sentences.slice(0, 3).join(' ');
        }
      }
      
      addMessage(aiResponse, 'assistant');
      if (speechHandlerRef.current) {
        speechHandlerRef.current.speak(aiResponse);
      }
      
      updateStatus('Ready to assist');
      console.log(`Final response was generated by ${modelUsed} model`);
    } catch (error) {
      console.error('API Error:', error);
      updateStatus('Error occurred');
      addMessage("I'm having trouble responding right now, but I'm still here to listen. Feel free to continue sharing, and I'll do my best to help.", 'assistant');
    } finally {
      setIsTyping(false);
    }
  };
  
  // Send message
  const sendMessage = async () => {
    if (inputValue.trim() === '') return;
    
    addMessage(inputValue, 'user');
    setInputValue('');
    
    try {
      await processMessage(inputValue);
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage("I'm having trouble responding. Can we try again?", 'assistant');
    }
  };
  
  // Toggle voice listening
  const toggleVoiceListening = () => {
    if (voiceInputRef.current) {
      voiceInputRef.current.toggleListening();
    }
  };
  
  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Clear chat
  const clearChat = () => {
    setMessages([]);
    addMessage("I'm here to support you. How are you feeling now?", 'assistant');
  };
  
  // Change API key
  const changeApiKey = () => {
    setShowApiModal(true);
  };
  
  // Save API key
  const saveApiKey = () => {
    const key = apiKeyInput.trim();
    const backupKey1 = backupApiKeyInput1.trim();
    const backupKey2 = backupApiKeyInput2.trim();
    
    // Save main API key
    if (key) {
      setApiKey(key);
      setUsingDefaultKey(false);
      localStorage.setItem('openRouterApiKey', key);
    } else {
      // If empty key is provided, use the default one
      setApiKey('');
      setUsingDefaultKey(true);
      localStorage.removeItem('openRouterApiKey');
    }
    
    // Save backup API keys
    if (backupKey1) {
      setBackupApiKey1(backupKey1);
      localStorage.setItem('openRouterApiKey_backup1', backupKey1);
    } else {
      setBackupApiKey1('');
      localStorage.removeItem('openRouterApiKey_backup1');
    }
    
    if (backupKey2) {
      setBackupApiKey2(backupKey2);
      localStorage.setItem('openRouterApiKey_backup2', backupKey2);
    } else {
      setBackupApiKey2('');
      localStorage.removeItem('openRouterApiKey_backup2');
    }
    
    setShowApiModal(false);
    setApiKeyInput('');
    setBackupApiKeyInput1('');
    setBackupApiKeyInput2('');
    
    if (messages.length === 0) {
      addMessage("I'm here to support your mental wellbeing. How can I help you today?", 'assistant');
    }
  };
  
  // Update status indicator
  const updateStatus = (status: string) => {
    setStatusText(status);
    
    if (status.includes('Listening')) {
      setStatusIcon('fas fa-microphone pulse');
    } else if (status.includes('Speaking')) {
      setStatusIcon('fas fa-volume-up pulse');
    } else if (status.includes('Processing')) {
      setStatusIcon('fas fa-cog fa-spin');
    } else if (status.includes('Error')) {
      setStatusIcon('fas fa-exclamation-circle');
    } else {
      setStatusIcon('fas fa-circle');
    }
  };
  
  // Scroll chat to bottom
  const scrollToBottom = () => {
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.scrollTop = chatInterfaceRef.current.scrollHeight;
    }
  };
  
  // Handle voice selection
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceIndex = e.target.value;
    setSelectedVoice(voiceIndex);
    if (speechHandlerRef.current) {
      speechHandlerRef.current.setVoice(voiceIndex);
    }
  };
  
  // Handle speed selection
  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoiceSpeed(e.target.value);
  };
  
  // Handle key press for sending message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-5">
      <div className="container">
        <div className="header">
          <i className="fas fa-robot"></i>
          P.O.O.J.A. AI
        </div>
        <p className="description">Your advanced AI mental health assistant with voice capabilities</p>
        <p className="acronym-explanation">
          <span>P</span>ersonalized <span>O</span>nline <span>O</span>utreach for <span>J</span>oy and <span>A</span>ssistance
        </p>
        
        <div className="profile-image-container">
          <Image 
            src="/Animation.gif" 
            alt="P.O.O.J.A Profile" 
            className="profile-image"
            width={120}
            height={120}
          />
        </div>
        
        <div className="chat-interface" ref={chatInterfaceRef}>
          <div id="chatMessages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}-message`}>
                <div className="chat-bubble">
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} />
                  ) : (
                    <div>{msg.text}</div>
                  )}
                  <div className="message-time">{msg.time}</div>
                </div>
              </div>
            ))}
          </div>
          
          {isTyping && (
            <div className="chat-message ai-message">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
        </div>
        
        <div className="audio-visualizer" ref={audioVisualizerRef}>
          {/* Bars will be added dynamically */}
        </div>
        
        <div className="input-container">
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Enter your question..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="voice-button" 
            ref={voiceButtonRef}
            onClick={toggleVoiceListening}
          >
            <i className="fas fa-microphone"></i>
          </button>
          <button 
            className="send-button"
            onClick={sendMessage}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
        
        <div className="status-indicator">
          <i className={statusIcon}></i> <span>{statusText}</span>
          {usingDefaultKey && <span className="ml-2 text-xs">(Using default API key)</span>}
        </div>
        
        <div className="controls">
          <button className="control-button" onClick={toggleSettings}>
            <i className={showSettings ? "fas fa-times" : "fas fa-cog"}></i> 
            {showSettings ? "Close" : "Settings"}
          </button>
          <button className="control-button" onClick={clearChat}>
            <i className="fas fa-trash"></i> Clear Chat
          </button>
        </div>
        
        {showSettings && (
          <div className="settings-panel" style={{ display: 'block' }}>
            <div className="settings-title">Settings</div>
            
            <div className="settings-option">
              <label className="settings-label">API Key</label>
              <div className="api-key-container">
                <input 
                  type="password" 
                  className="settings-select" 
                  readOnly 
                  value={usingDefaultKey ? 'Using default API key' : '••••••••••••••••'}
                />
                <button className="control-button" onClick={changeApiKey}>
                  <i className="fas fa-key"></i> Change API Key
                </button>
              </div>
            </div>
            
            <div className="settings-option">
              <label className="settings-label">Voice Type (only available for desktop users)</label>
              <select 
                className="settings-select"
                value={selectedVoice}
                onChange={handleVoiceChange}
              >
                <option value="default">Default Voice</option>
                {speechHandlerRef.current && 
                  speechHandlerRef.current.getVoices().map((voice, index) => (
                    <option key={index} value={index}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))
                }
              </select>
            </div>
            
            <div className="settings-option">
              <label className="settings-label">Voice Speed</label>
              <select 
                className="settings-select"
                value={voiceSpeed}
                onChange={handleSpeedChange}
              >
                <option value="0.8">Slow</option>
                <option value="1">Normal</option>
                <option value="1.2">Fast</option>
                <option value="1.5">Very Fast</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content">
            <h2 className="modal-title">API Key Options</h2>
            <p style={{ fontSize: '14px', color: '#faf9f9', marginBottom: '10px' }}>
                You can use your own OpenRouter API keys or the default key. Multiple keys provide fallback options.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-200 mb-1">Primary API Key</label>
              <input 
                type="password" 
                className="modal-input" 
                placeholder="Enter your primary OpenRouter API key"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-200 mb-1">Backup API Key 1 (Optional)</label>
              <input 
                type="password" 
                className="modal-input" 
                placeholder="Enter your first backup API key"
                value={backupApiKeyInput1}
                onChange={(e) => setBackupApiKeyInput1(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-200 mb-1">Backup API Key 2 (Optional)</label>
              <input 
                type="password" 
                className="modal-input" 
                placeholder="Enter your second backup API key"
                value={backupApiKeyInput2}
                onChange={(e) => setBackupApiKeyInput2(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 mt-4">
              <button className="modal-button" onClick={saveApiKey}>
                {apiKeyInput.trim() ? 'Save API Keys' : 'Use Default API Key'}
              </button>
            </div>
            
            <div className="security-note" style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '15px', padding: '8px', border: '1px solid #444', borderRadius: '4px' }}>
              <i className="fas fa-shield-alt mr-1"></i> <strong>Security Note:</strong> Your API keys are stored locally on your device and are sent securely to the server for each request. Keys are never exposed in the frontend code.
            </div>
            
            <p style={{ fontSize: '12px', color: '#faf9f9', marginTop: '10px', textAlign: 'center' }}>
                Don&apos;t have a key? <a href="https://openrouter.ai" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontStyle: 'bold' }}>Get one from OpenRouter</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 