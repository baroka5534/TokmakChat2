import React, { useState } from 'react';
import { Message, MessageRole } from '../types';
import { BotIcon, UserIcon, MicrophoneIcon, SendIcon, SettingsIcon, DocumentTextIcon, PaperclipIcon, CameraIcon, DownloadIcon, VolumeUpIcon, VolumeOffIcon } from './IconComponents';

type ListeningMode = 'push-to-talk' | 'continuous';

interface ChatInterfaceProps {
    messages: Message[];
    userInput: string;
    onUserInput: (input: string) => void;
    onSendMessage: () => void;
    isLoading: boolean;
    isListening: boolean;
    onToggleListening: () => void; // For continuous mode
    onStartListening: () => void; // For PTT mode
    onStopListening: () => void; // For PTT mode
    listeningMode: ListeningMode;
    onListeningModeChange: (mode: ListeningMode) => void;
    browserSupport: { recognition: boolean; synthesis: boolean };
    voices: SpeechSynthesisVoice[];
    speechRate: number;
    onSpeechRateChange: (rate: number) => void;
    selectedVoiceURI: string | undefined;
    onSelectedVoiceURIChange: (uri: string) => void;
    onInputFocus: () => void;
    onInputBlur: () => void;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    dataFileName: string;
    isSpeechEnabled: boolean;
    onToggleSpeech: () => void;
    onPromptClick: (prompt: string) => void;
}

const EXAMPLE_PROMPTS = [
    "En yüksek puanlı 3 ürün hangisi?",
    "Kategori bazında ortalama fiyatlar nedir?",
    "Stok sayısı 50'den az olan ürünleri listele.",
];


const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === MessageRole.USER;
    const isSystem = message.role === MessageRole.SYSTEM;

    if (isSystem) {
        return (
             <div className="flex justify-center my-2">
                <p className="text-xs text-center text-red-400 bg-red-900/30 px-3 py-1 rounded-full">{message.content}</p>
            </div>
        )
    }

    return (
        <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
            {
                !isUser &&
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <BotIcon className="w-5 h-5 text-on-primary" />
                </div>
            }
            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${isUser ? 'bg-primary text-on-primary' : 'bg-surface'}`}>
                <p className="text-sm">{message.content}</p>
            </div>
             {
                isUser &&
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-on-surface" />
                </div>
            }
        </div>
    );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    userInput,
    onUserInput,
    onSendMessage,
    isLoading,
    isListening,
    onToggleListening,
    onStartListening,
    onStopListening,
    listeningMode,
    onListeningModeChange,
    browserSupport,
    voices,
    speechRate,
    onSpeechRateChange,
    selectedVoiceURI,
    onSelectedVoiceURIChange,
    onInputFocus,
    onInputBlur,
    onFileUpload,
    dataFileName,
    isSpeechEnabled,
    onToggleSpeech,
    onPromptClick,
}) => {
    const chatContainerRef = React.useRef<HTMLDivElement>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showDataPanel, setShowDataPanel] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isLoading) {
            onSendMessage();
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col h-full bg-surface rounded-lg overflow-hidden p-4">
            <div className="flex-grow overflow-y-auto pr-2" ref={chatContainerRef}>
                {messages.map((msg, index) => (
                    <ChatMessage key={index} message={msg} />
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3 my-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <BotIcon className="w-5 h-5 text-on-primary" />
                        </div>
                        <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-surface flex items-center">
                            <div className="w-2 h-2 bg-on-surface-muted rounded-full animate-pulse-fast [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-on-surface-muted rounded-full animate-pulse-fast [animation-delay:-0.15s] mx-1"></div>
                            <div className="w-2 h-2 bg-on-surface-muted rounded-full animate-pulse-fast"></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 pt-4 border-t border-white/10 flex flex-col gap-4">
                {!isLoading && (
                     <div className="flex flex-wrap justify-center gap-2 px-2">
                         <p className="w-full text-center text-xs text-on-surface-muted mb-1">Örnek Sorular</p>
                        {EXAMPLE_PROMPTS.map((prompt, i) => (
                            <button
                                key={i}
                                onClick={() => onPromptClick(prompt)}
                                className="px-3 py-1.5 bg-base text-on-surface-muted text-xs rounded-full hover:bg-primary hover:text-on-primary transition-colors"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}
                
                {(showSettings || showDataPanel) && (
                    <div className="p-4 bg-base rounded-lg border border-white/10 transition-all duration-300 ease-in-out">
                        {showSettings && browserSupport.synthesis && (
                            <>
                                <h3 className="text-sm font-bold mb-3 text-on-surface">Konuşma Ayarları</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="voice-select" className={`block text-xs font-medium mb-1 ${isSpeechEnabled ? 'text-on-surface-muted' : 'text-gray-500'}`}>Ses</label>
                                        <select
                                            id="voice-select"
                                            value={selectedVoiceURI ?? ''}
                                            onChange={(e) => onSelectedVoiceURIChange(e.target.value)}
                                            disabled={!isSpeechEnabled}
                                            className="w-full bg-surface border border-white/20 rounded-md p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {voices.map((voice) => (
                                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                                    {voice.name} ({voice.lang})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="rate-slider" className={`block text-xs font-medium mb-1 ${isSpeechEnabled ? 'text-on-surface-muted' : 'text-gray-500'}`}>
                                            Hız: <span className="font-bold text-on-surface">{speechRate.toFixed(1)}x</span>
                                        </label>
                                        <input
                                            id="rate-slider"
                                            type="range"
                                            min="0.5"
                                            max="2"
                                            step="0.1"
                                            value={speechRate}
                                            onChange={(e) => onSpeechRateChange(parseFloat(e.target.value))}
                                            disabled={!isSpeechEnabled}
                                            className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                         {showDataPanel && (
                             <div>
                                <h3 className="text-sm font-bold mb-3 text-on-surface">Veri Ayarları</h3>
                                <p className="text-xs text-on-surface-muted mb-2">Analiz etmek için kendi JSON dosyanızı yükleyin. Dosya, ürün nesnelerinden oluşan bir dizi olmalıdır.</p>
                                <p className="text-xs text-on-surface-muted mb-4">Mevcut Veri: <span className="font-bold text-secondary">{dataFileName}</span></p>
                                <button
                                    onClick={handleUploadClick}
                                    className="w-full bg-primary text-on-primary p-2 rounded-md hover:bg-primary-variant transition-colors text-sm"
                                >
                                    JSON Dosyası Seç
                                </button>
                                <input type="file" ref={fileInputRef} onChange={onFileUpload} accept=".json" className="hidden" />
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex items-center gap-3">
                    <div className="flex-grow flex items-center bg-base rounded-full px-2">
                        <button onClick={handleUploadClick} title="Dosya Ekle" className="p-2 text-on-surface-muted hover:text-on-surface transition-colors rounded-full">
                            <PaperclipIcon className="w-5 h-5"/>
                        </button>
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => onUserInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            onFocus={onInputFocus}
                            onBlur={onInputBlur}
                            placeholder="Bir mesaj yazın veya dosya ekleyin..."
                            className="w-full bg-transparent px-2 py-2 text-on-surface focus:outline-none"
                            disabled={isLoading || isListening}
                        />
                    </div>
                     <button
                        onClick={onSendMessage}
                        disabled={!userInput.trim() || isLoading}
                        title="Mesaj Gönder"
                        className="flex-shrink-0 p-3 rounded-full bg-base text-on-surface-muted disabled:text-gray-600 disabled:cursor-not-allowed hover:text-on-surface transition-colors"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex justify-center items-center gap-4">
                    <div className="flex items-center bg-base rounded-full p-1 text-sm">
                        <button onClick={() => onListeningModeChange('push-to-talk')} className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 ${listeningMode === 'push-to-talk' ? 'bg-surface text-on-surface' : 'text-on-surface-muted hover:bg-white/10'}`}>
                            <MicrophoneIcon className="w-4 h-4" />
                            <span>Bas-Konuş</span>
                        </button>
                        <button onClick={() => onListeningModeChange('continuous')} className={`px-3 py-1.5 rounded-full transition-colors ${listeningMode === 'continuous' ? 'bg-surface text-on-surface' : 'text-on-surface-muted hover:bg-white/10'}`}>
                            <span>Sürekli</span>
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex items-center bg-base rounded-full p-1 gap-1">
                        <button title="Kamera (devre dışı)" className="p-2 text-on-surface-muted rounded-full cursor-not-allowed opacity-50">
                            <CameraIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => { setShowDataPanel(!showDataPanel); setShowSettings(false); }} title="Veri Ayarları" className={`p-2 rounded-full transition-colors ${showDataPanel ? 'bg-primary/70 text-on-primary' : 'text-on-surface-muted hover:bg-white/10'}`}>
                            <DocumentTextIcon className="w-5 h-5" />
                        </button>
                        <button title="İndir (devre dışı)" className="p-2 text-on-surface-muted rounded-full cursor-not-allowed opacity-50">
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                        {browserSupport.synthesis && (
                           <>
                                <button onClick={onToggleSpeech} title={isSpeechEnabled ? "Sesi Kapat" : "Sesi Aç"} className="p-2 rounded-full transition-colors text-on-surface-muted hover:bg-white/10">
                                    {isSpeechEnabled ? <VolumeUpIcon className="w-5 h-5" /> : <VolumeOffIcon className="w-5 h-5" />}
                                </button>
                                <button onClick={() => { setShowSettings(!showSettings); setShowDataPanel(false); }} title="Konuşma Ayarları" className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-primary/70 text-on-primary' : 'text-on-surface-muted hover:bg-white/10'}`}>
                                    <SettingsIcon className="w-5 h-5" />
                                </button>
                           </>
                        )}
                    </div>
                    <button
                        onMouseDown={listeningMode === 'push-to-talk' ? onStartListening : undefined}
                        onMouseUp={listeningMode === 'push-to-talk' ? onStopListening : undefined}
                        onMouseLeave={listeningMode === 'push-to-talk' ? onStopListening : undefined}
                        onClick={listeningMode === 'continuous' ? onToggleListening : undefined}
                        disabled={isLoading || !browserSupport.recognition}
                        title="Sesli Komut"
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all transform active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                        <MicrophoneIcon className="w-8 h-8" />
                    </button>
                </div>
                 {!browserSupport.recognition &&
                    <p className="text-xs text-on-surface-muted text-center -mt-2">Sesli giriş tarayıcınızda desteklenmiyor.</p>
                }
            </div>
        </div>
    );
};