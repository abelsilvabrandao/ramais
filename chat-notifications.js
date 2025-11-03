// ============================================
// SISTEMA DE NOTIFICAÇÕES PARA O CHAT
// ============================================
// Este arquivo adiciona notificações em tempo real
// para mensagens recebidas no sistema de ramais

import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc,
    getDoc,
    orderBy,
    limit,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Estado global
let notificationsEnabled = false;
let currentUserId = null;
let lastNotificationTime = {};
let activeListeners = [];
let lastUpdateTime = 0;
const NOTIFICATION_THROTTLE = 3000; // 3 segundos entre notificações do mesmo chat

// Inicializa o áudio de notificação
try {
    var NOTIFICATION_SOUND = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
} catch (error) {
    console.warn('Não foi possível carregar o som de notificação:', error);
}

/**
 * Solicita permissão para notificações
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Este navegador não suporta notificações');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        notificationsEnabled = permission === 'granted';
        
        if (notificationsEnabled) {
            console.log('✅ Permissão de notificação concedida');
        } else {
            console.warn('⚠️ Permissão de notificação negada');
        }
        
        return notificationsEnabled;
    } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error);
        return false;
    }
}

/**
 * Mostra uma notificação do navegador
 */
function showBrowserNotification(title, options = {}) {
    if (!notificationsEnabled || !('Notification' in window)) {
        return null;
    }

    // Previne notificações duplicadas muito rápidas
    const notificationKey = `${title}-${options.body}`;
    const now = Date.now();
    
    if (lastNotificationTime[notificationKey] && 
        now - lastNotificationTime[notificationKey] < 3000) {
        console.log('Notificação duplicada ignorada:', title);
        return null;
    }
    
    lastNotificationTime[notificationKey] = now;

    try {
        const notification = new Notification(title, {
            icon: options.icon || '/icons/icon-192x192.png',
            badge: options.badge || '/icons/icon-96x96.png',
            body: options.body || '',
            tag: options.tag || 'chat-message',
            requireInteraction: false,
            silent: false,
            ...options
        });

        // Toca o som de notificação
        playNotificationSound();

        // Adiciona evento de clique
        notification.onclick = function(event) {
            event.preventDefault();
            window.focus();
            
            // Fecha a notificação
            notification.close();
            
            // Chama callback se fornecido
            if (options.onclick) {
                options.onclick();
            }
        };

        // Auto-fecha após 5 segundos
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    } catch (error) {
        console.error('Erro ao mostrar notificação:', error);
        return null;
    }
}

/**
 * Toca o som de notificação
 */
function playNotificationSound() {
    try {
        NOTIFICATION_SOUND.currentTime = 0;
        NOTIFICATION_SOUND.play().catch(err => {
            console.warn('Não foi possível tocar o som de notificação:', err);
        });
    } catch (error) {
        console.warn('Erro ao tocar som:', error);
    }
}

/**
 * Inicializa o sistema de notificações
 * @param {Object} db - Instância do Firestore
 * @param {string} userId - ID do usuário atual
 */
export async function initializeNotifications(db, userId) {
    if (!db || !userId) {
        console.error('❌ Parâmetros inválidos para inicializar notificações');
        return;
    }

    currentUserId = userId;
    console.log(`🔔 Inicializando sistema de notificações para usuário: ${userId}`);

    // Solicita permissão se ainda não foi solicitada
    if (Notification.permission === 'default') {
        await requestNotificationPermission();
    } else if (Notification.permission === 'granted') {
        notificationsEnabled = true;
    }

    // Remove listeners anteriores
    stopNotifications();

    // Configura listener para monitorar TODOS os chats onde o usuário participa
    const chatsRef = collection(db, 'chats');
    const q = query(
        chatsRef,
        where('participants', 'array-contains', userId)
    );

    console.log('📡 Configurando listener global de mensagens...');

    // Rastreia o último ID de mensagem notificada para cada chat
    const lastNotifiedMessage = {};

    const unsubscribeChats = onSnapshot(q, async (snapshot) => {
        const now = Date.now();
        
        // Processa cada mudança no chat
        for (const change of snapshot.docChanges()) {
            if (change.type !== 'modified') continue;
            
            const chatData = change.doc.data();
            const chatId = change.doc.id;
            
            // Verifica se a mensagem já foi notificada recentemente
            const lastNotified = lastNotifiedMessage[chatId] || 0;
            const messageTime = chatData.lastMessageAt?.toDate?.()?.getTime() || 0;
            
            // Evita notificações duplicadas ou muito rápidas
            if (now - lastNotified < 5000 || messageTime <= lastNotified) {
                continue;
            }
            
            // Verifica se a mensagem foi enviada por outro usuário
            const lastMessageSenderId = chatData.lastMessageSenderId;
            if (!lastMessageSenderId || lastMessageSenderId === userId) {
                continue;
            }
            
            // Verifica se há mensagens não lidas
            const unreadCount = chatData.unreadCounts?.[userId] || 0;
            if (unreadCount <= 0 || !chatData.lastMessage) {
                continue;
            }
            
            try {
                // Busca informações do remetente
                const senderName = await getSenderName(db, lastMessageSenderId, chatData);
                
                // Mostra notificação apenas se o chat não estiver visível
                const isChatVisible = document.querySelector(`[data-chat-id="${chatId}"][data-active="true"]`);
                
                if (!isChatVisible) {
                    showBrowserNotification(
                        `💬 Nova mensagem de ${senderName}`,
                        {
                            body: chatData.lastMessage.length > 50 
                                ? chatData.lastMessage.substring(0, 50) + '...' 
                                : chatData.lastMessage,
                            tag: `chat-${chatId}`,
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/icon-96x96.png',
                            requireInteraction: false,
                            data: {
                                chatId: chatId,
                                timestamp: messageTime
                            },
                            onclick: () => {
                                // Abre o chat quando clicar na notificação
                                if (window.chatModule?.openChatById) {
                                    window.chatModule.openChatById(chatId);
                                }
                                // Fecha a notificação
                                window.focus();
                            }
                        }
                    );
                    
                    console.log(`🔔 Notificação enviada para mensagem de ${senderName}`);
                    lastNotifiedMessage[chatId] = now;
                } else {
                    console.log(`💬 Mensagem em chat visível, notificação suprimida`);
                }
            } catch (error) {
                console.error('Erro ao processar notificação:', error);
            }
        }
    }, (error) => {
        console.error('❌ Erro no listener de notificações:', error);
    });

    activeListeners.push(unsubscribeChats);

    // Também monitora mensagens individuais em tempo real
    setupMessageListeners(db, userId);
}

/**
 * Configura listeners para mensagens em subcoleções
 */
async function setupMessageListeners(db, userId) {
    if (!userId) {
        console.warn('ID do usuário não fornecido para configurar listeners');
        return;
    }

    console.log(`[notifications] Configurando listeners para o usuário: ${userId}`);
    
    // Referência para os chats do usuário
    const userChatsRef = collection(db, 'users', userId, 'chats');
    
    // Configura listener para a lista de chats do usuário
    const q = query(userChatsRef, orderBy('lastMessageAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
        async (snapshot) => {
            const now = Date.now();
            if (now - lastUpdateTime < NOTIFICATION_THROTTLE) {
                console.log('[notifications] Atualização ignorada (throttling)');
                return;
            }
            lastUpdateTime = now;
            
            console.log(`[notifications] Atualização recebida: ${snapshot.docChanges().length} alterações`);
            
            for (const change of snapshot.docChanges()) {
                const chatData = change.doc.data();
                console.log(`[notifications] Mudança no chat ${change.doc.id}:`, change.type, chatData);
                
                // Processa apenas mensagens novas ou atualizações
                if (change.type === 'added' || change.type === 'modified') {
                    await handleNewMessage(change.doc.id, chatData, userId);
                }
            }
        },
        (error) => {
            console.error('[notifications] Erro no listener de mensagens:', error);
            // Tenta reconectar após um tempo
            setTimeout(() => setupMessageListeners(db, userId), 5000);
        }
    );
    
    // Armazena a função para cancelar o listener
    activeListeners.push(unsubscribe);
    
    console.log(`[notifications] Listeners ativos: ${activeListeners.length}`);
    
    // Configura o MutationObserver para o container de notificações
    const setupNotificationObserver = () => {
        const notificationContainer = document.querySelector('.notifications-container');
        if (notificationContainer) {
            try {
                const observer = new MutationObserver((mutations) => {
                    console.log('[notifications] Alteração detectada no container de notificações');
                });
                
                observer.observe(notificationContainer, {
                    childList: true,
                    subtree: true
                });
                
                return observer;
            } catch (error) {
                console.error('Erro ao configurar MutationObserver:', error);
                return null;
            }
        }
        return null;
    };
    
    // Tenta configurar o observer imediatamente
    const observer = setupNotificationObserver();
    if (observer) {
        activeListeners.push(() => observer.disconnect());
    }
}

/**
 * Mostra notificação de nova mensagem
 * @param {string} chatId - ID do chat
 * @param {Object} messageData - Dados da mensagem
 */
async function showNewMessageNotification(chatId, messageData) {
    if (!messageData || !messageData.senderId || messageData.senderId === currentUserId) {
        return;
    }

    try {
        const senderName = await getSenderName(db, messageData.senderId, {});
        
        showBrowserNotification(
            `💬 Nova mensagem de ${senderName}`,
            {
                body: messageData.text || 'Nova mensagem recebida',
                tag: `message-${chatId}-${Date.now()}`,
                icon: '/icons/icon-192x192.png',
                onclick: () => {
                    if (window.chatModule && window.chatModule.openChatById) {
                        window.chatModule.openChatById(chatId);
                    }
                }
            }
        );
    } catch (error) {
        console.error('Erro ao mostrar notificação de mensagem:', error);
    }
}

/**
 * Busca o nome do remetente
 * @param {Object} db - Instância do Firestore
 * @param {string} senderId - ID do remetente
 * @param {Object} chatData - Dados do chat
 * @returns {Promise<string>} Nome do remetente
 */
async function getSenderName(db, senderId, chatData = {}) {
    if (!senderId) return 'Usuário';
    
    try {
        // Tenta buscar no participantDetails do chat
        if (chatData.participantDetails && chatData.participantDetails[senderId]) {
            return chatData.participantDetails[senderId].name || 'Usuário';
        }

        // Tenta buscar na coleção people
        const personDoc = await getDoc(doc(db, 'people', senderId));
        if (personDoc.exists()) {
            return personDoc.data().name || 'Usuário';
        }

        // Fallback para chat_status
        const statusDoc = await getDoc(doc(db, 'chat_status', senderId));
        if (statusDoc.exists()) {
            return statusDoc.data().displayName || 'Usuário';
        }

        return 'Usuário';
    } catch (error) {
        console.error('Erro ao buscar nome do remetente:', error);
        return 'Usuário';
    }
}

/**
 * Para todos os listeners de notificações
 */
export function stopNotifications() {
    console.log('🛑 Parando listeners de notificações...');
    
    activeListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    activeListeners = [];
}

/**
 * Verifica se as notificações estão habilitadas
 */
export function areNotificationsEnabled() {
    return notificationsEnabled && Notification.permission === 'granted';
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('[notifications] Módulo de notificações carregado');
    
    // Configura o MutationObserver para o container de notificações
    const setupNotificationObserver = () => {
        const notificationContainer = document.querySelector('.notifications-container');
        if (notificationContainer) {
            try {
                const observer = new MutationObserver((mutations) => {
                    console.log('[notifications] Alteração detectada no container de notificações');
                });
                
                observer.observe(notificationContainer, {
                    childList: true,
                    subtree: true
                });
                
                return observer;
            } catch (error) {
                console.error('Erro ao configurar MutationObserver:', error);
                return null;
            }
        }
        return null;
    };
    
    // Tenta configurar o observer imediatamente
    const observer = setupNotificationObserver();
    if (observer) {
        activeListeners.push(() => observer.disconnect());
    }
});

// Exporta para uso global
window.chatNotifications = {
    requestNotificationPermission,
    initializeNotifications,
    stopNotifications,
    areNotificationsEnabled,
    showNewMessageNotification
};
