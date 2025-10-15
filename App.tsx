import React, { useState, useCallback, useEffect } from 'react';
import RobotScene from './components/RobotScene';
import { ChatInterface } from './components/ChatInterface';
import DataVisualization from './components/DataVisualization';
import { Message, MessageRole, RobotState, ChartData, GeminiResponse, InteractionState, Product } from './types';
import { MOCK_PRODUCTS } from './constants';
import { analyzeProductData } from './services/geminiService';
import { useSpeech } from './hooks/useSpeech';

const CHAT_HISTORY_KEY = 'veriAkisiChatHistory';

const initialMessage: Message = { 
    role: MessageRole.BOT, 
    content: "Merhaba! Ben VeriAkışı. Ürün verilerini analiz etmenize nasıl yardımcı olabilirim? Örneğin, 'Hangi kategoride en çok stok var?' veya 'En pahalı 3 ürünü göster' diye sorabilirsiniz." 
};

type ListeningMode = 'push-to-talk' | 'continuous';

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
            return savedHistory ? JSON.parse(savedHistory) : [initialMessage];
        } catch (error) {
            console.error("Failed to parse chat history from localStorage", error);
            return [initialMessage];
        }
    });
    const [userInput, setUserInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [robotState, setRobotState] = useState<RobotState>(RobotState.IDLE);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [interactionState, setInteractionState] = useState<InteractionState>(InteractionState.DEFAULT);
    const [productData, setProductData] = useState<Product[]>(MOCK_PRODUCTS);
    const [dataFileName, setDataFileName] = useState<string>('Örnek Ürün Verisi');
    const [listeningMode, setListeningMode] = useState<ListeningMode>('push-to-talk');
    const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(true);


    useEffect(() => {
        try {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [messages]);
    
    const onSpeechResult = useCallback((result: string) => {
        setUserInput(result);
    }, []);

    const { isListening, isSpeaking, startListening, stopListening, speak, browserSupport, voices } = useSpeech(onSpeechResult);
    
    const [speechRate, setSpeechRate] = useState(1);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (voices.length > 0 && !selectedVoiceURI) {
            const defaultVoice = 
                voices.find(v => v.lang.startsWith('tr')) || 
                voices.find(v => v.name === 'Google US English') || 
                voices.find(v => v.lang.startsWith('en')) || 
                voices[0];
            if (defaultVoice) {
                setSelectedVoiceURI(defaultVoice.voiceURI);
            }
        }
    }, [voices, selectedVoiceURI]);

    useEffect(() => {
        if(isListening) {
            setRobotState(RobotState.LISTENING);
        } else if (isLoading) {
            setRobotState(RobotState.THINKING);
        } else if (isSpeaking) {
            setRobotState(RobotState.SPEAKING);
        } else {
            setRobotState(RobotState.IDLE);
        }
    }, [isListening, isLoading, isSpeaking]);

    const analyzeAndRespond = useCallback(async (prompt: string) => {
        setIsLoading(true);
        setInteractionState(InteractionState.CONFIRMATION);
        setTimeout(() => {
            setInteractionState(prevState => (prevState === InteractionState.CONFIRMATION ? InteractionState.DEFAULT : prevState));
        }, 1000);

        try {
            const result: GeminiResponse = await analyzeProductData(prompt, productData);
            
            const newBotMessage: Message = { role: MessageRole.BOT, content: result.summary };
            setMessages(prev => [...prev, newBotMessage]);
            setChartData(result.chart);

            if (result.chart && result.chart.type !== 'none' && result.chart.data.length > 0) {
                setInteractionState(InteractionState.ANALYSIS_COMPLETE);
                setTimeout(() => setInteractionState(InteractionState.DEFAULT), 4000);
            }

            if (isSpeechEnabled && browserSupport.synthesis) {
                speak(result.summary, {
                   rate: speechRate,
                   voiceURI: selectedVoiceURI,
                   onEnd: () => {
                       setRobotState(RobotState.IDLE);
                   }
                });
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
            const newErrorMessage: Message = { role: MessageRole.BOT, content: `Hata: ${errorMessage}` };
            setMessages(prev => [...prev, newErrorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [productData, browserSupport.synthesis, isSpeechEnabled, speak, speechRate, selectedVoiceURI]);

    const handleSendMessage = useCallback(async () => {
        const trimmedInput = userInput.trim();
        if (!trimmedInput || isLoading) return;

        const newUserMessage: Message = { role: MessageRole.USER, content: trimmedInput };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        await analyzeAndRespond(trimmedInput);
    }, [userInput, isLoading, analyzeAndRespond]);

    const handlePromptClick = useCallback(async (prompt: string) => {
        if (isLoading) return;
        const newUserMessage: Message = { role: MessageRole.USER, content: prompt };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput(''); // Clear input in case user was typing something else
        await analyzeAndRespond(prompt);
    }, [isLoading, analyzeAndRespond]);

    useEffect(() => {
        // Automatically send message when listening stops and there's a result
        if (!isListening && userInput) {
             handleSendMessage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening]);


    const handleToggleListening = () => { // For continuous mode
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleStartListening = () => { // For PTT mode
        if (!isListening) {
            startListening();
        }
    }

    const handleStopListening = () => { // For PTT mode
        if (isListening) {
            stopListening();
        }
    }
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("Dosya içeriği okunamadı.");
                }
                const data = JSON.parse(text);
                if (!Array.isArray(data)) {
                    throw new Error("JSON bir dizi olmalıdır.");
                }
                // Basic validation for product-like structure
                if (data.length > 0 && (typeof data[0].name === 'undefined' || typeof data[0].price === 'undefined')) {
                    console.warn("Yüklenen veri beklenen ürün yapısıyla eşleşmiyor olabilir.");
                }
                
                setProductData(data);
                setDataFileName(file.name);
                setMessages(prev => [...prev, { role: MessageRole.BOT, content: `"${file.name}" verisi başarıyla yüklendi. Şimdi bu veriyle ilgili sorular sorabilirsiniz.` }]);
            } catch (err) {
                 const errorMessage = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
                 setMessages(prev => [...prev, { role: MessageRole.BOT, content: `Dosya okunurken hata oluştu: ${errorMessage}` }]);
            }
        };
        reader.readAsText(file);
    };

    return (
        <main className="w-screen h-screen p-4 bg-base flex flex-col lg:flex-row gap-4">
            {/* Left column on desktop, top section on mobile */}
            <div className="lg:w-1/3 h-2/5 lg:h-full flex flex-col gap-4">
                {/* Robot Scene takes full height on mobile, 50% on desktop */}
                <div className="flex-grow h-0">
                    <RobotScene state={robotState} interactionState={interactionState} />
                </div>
                {/* Data viz is only here on desktop */}
                <div className="hidden lg:flex flex-grow h-0">
                    <DataVisualization chartData={chartData} />
                </div>
            </div>

            {/* Right column on desktop, bottom section on mobile */}
            <div className="lg:w-2/3 h-3/5 lg:h-full flex flex-col gap-4">
                 {/* Data viz is only here on mobile, taking up part of the space */}
                <div className="block lg:hidden flex-[2_2_0%] min-h-0">
                    <DataVisualization chartData={chartData} />
                </div>
                {/* Chat takes all space on desktop, remaining on mobile */}
                <div className="flex-[3_3_0%] lg:flex-1 min-h-0">
                     <ChatInterface 
                        messages={messages}
                        userInput={userInput}
                        onUserInput={setUserInput}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        isListening={isListening}
                        onToggleListening={handleToggleListening}
                        onStartListening={handleStartListening}
                        onStopListening={handleStopListening}
                        listeningMode={listeningMode}
                        onListeningModeChange={setListeningMode}
                        browserSupport={browserSupport}
                        voices={voices}
                        speechRate={speechRate}
                        onSpeechRateChange={setSpeechRate}
                        selectedVoiceURI={selectedVoiceURI}
                        onSelectedVoiceURIChange={setSelectedVoiceURI}
                        onInputFocus={() => setInteractionState(InteractionState.USER_TYPING)}
                        onInputBlur={() => setInteractionState(InteractionState.DEFAULT)}
                        onFileUpload={handleFileUpload}
                        dataFileName={dataFileName}
                        isSpeechEnabled={isSpeechEnabled}
                        onToggleSpeech={() => setIsSpeechEnabled(prev => !prev)}
                        onPromptClick={handlePromptClick}
                     />
                </div>
            </div>
        </main>
    );
};

export default App;