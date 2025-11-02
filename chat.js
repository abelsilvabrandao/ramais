// Importa a instância do Firebase já configurada
import { app, db } from './scriptusuario_clean.js';
import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    serverTimestamp,
    updateDoc,
    writeBatch,
    addDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// 🔔 Importa o sistema de notificações
import { 
    initializeNotifications, 
    requestNotificationPermission,
    stopNotifications 
} from './chat-notifications.js';

// Usa a instância do app já configurada
const auth = getAuth(app);

// Estado global do chat
let currentUser = null;

// Função para controlar a visibilidade do botão de chat
function updateChatButtonVisibility(user) {
    const chatButton = document.getElementById('chatButton');
    if (chatButton) {
        if (user) {
            // Se o usuário estiver logado, mostra o botão com animação
            chatButton.style.display = 'flex';
            // Força o navegador a renderizar o display:flex antes da animação
            setTimeout(() => {
                chatButton.style.opacity = '1';
                chatButton.style.transform = 'scale(1)';
            }, 10);
        } else {
            // Se o usuário não estiver logado, esconde o botão
            chatButton.style.opacity = '0';
            chatButton.style.transform = 'scale(0.8)';
            // Espera a animação terminar para esconder o elemento
            setTimeout(() => {
                chatButton.style.display = 'none';
            }, 300);
        }
    }
}

// Função para atualizar o status do usuário para offline
async function updateUserToOffline(userId) {
    if (!userId) {
        console.warn('ID do usuário não fornecido para atualização de status offline');
        return;
    }
    
    try {
        console.log(`[updateUserToOffline] Atualizando status para offline do usuário: ${userId}`);
        const statusRef = doc(db, 'chat_status', userId);
        await setDoc(statusRef, {
            status: 'offline',
            isOnline: false,
            lastSeen: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        console.log(`[updateUserToOffline] Status atualizado para offline com sucesso para o usuário: ${userId}`);
        return true;
    } catch (error) {
        console.error(`[updateUserToOffline] Erro ao atualizar status para offline:`, error);
        return false;
    }
}

// Função para limpar o status ao sair
async function handleBeforeUnload() {
    if (currentUser) {
        await updateUserToOffline(currentUser.uid);
    }
}

// Função para fazer logout do usuário
async function handleLogout() {
    if (!currentUser) return;
    
    try {
        // Atualiza o status para offline antes de fazer logout
        await updateUserToOffline(currentUser.uid);
        
        // Faz logout do Firebase Auth
        await signOut(auth);
        
        // Atualiza a interface
        updateUIForLogout();
        
        // Remove a classe 'logged-in' do body
        document.body.classList.remove('logged-in');
        
        console.log('[handleLogout] Logout realizado com sucesso');
        
        // Mostra mensagem de sucesso
        Swal.fire({
            title: 'Logout realizado',
            text: 'Você saiu do chat com sucesso!',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#006c5b'
        });
    } catch (error) {
        console.error('[handleLogout] Erro ao fazer logout:', error);
        // Mesmo em caso de erro, tenta atualizar a interface
        updateUIForLogout();
        document.body.classList.remove('logged-in');
        
        // Mostra mensagem de erro
        Swal.fire({
            title: 'Erro ao sair',
            text: 'Ocorreu um erro ao tentar sair. Por favor, tente novamente.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#e74c3c'
        });
    }
}

// Função para atualizar a interface após o logout
function updateUIForLogout() {
    // Esconde o botão de logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.style.display = 'none';
    }
    
    // Atualiza o botão de login
    const loginMenu = document.getElementById('loginMenuOption');
    if (loginMenu) {
        loginMenu.innerHTML = '<img src="chat.png" alt="Login" /><span>Entrar no Chat</span>';
        loginMenu.style.display = 'flex';
    }
    
    // Esconde o botão de chat flutuante
    updateChatButtonVisibility(null);
    
    // Fecha o modal de chat se estiver aberto
    const chatModal = document.getElementById('chatModal');
    if (chatModal) {
        chatModal.style.display = 'none';
    }
}

// Função para inicializar o MutationObserver de forma segura
function initializeMutationObserver() {
    // Verifica se o MutationObserver está disponível
    if (typeof MutationObserver === 'undefined') {
        console.warn('MutationObserver não suportado neste navegador');
        return null;
    }

    // Cria o observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Atualiza a visibilidade do botão de chat quando o DOM for alterado
                if (currentUser) {
                    updateChatButtonVisibility(currentUser);
                }
            }
        });
    });

    // Função para iniciar a observação
    const startObserving = () => {
        if (document.body) {
            try {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                console.log('MutationObserver iniciado com sucesso');
            } catch (error) {
                console.error('Erro ao iniciar MutationObserver:', error);
            }
        } else {
            // Se o body ainda não estiver disponível, tenta novamente em breve
            setTimeout(startObserving, 100);
        }
    };

    // Inicia a observação quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserving);
    } else {
        startObserving();
    }

    return observer;
}

// Inicializa o MutationObserver
let observer = initializeMutationObserver();

// Inicializa o listener de autenticação
onAuthStateChanged(auth, (user) => {
    // Remove os listeners antigos de beforeunload, se existirem
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', handleBeforeUnload);
    
    currentUser = user;
    updateChatButtonVisibility(user);
    
    if (user) {
        // Usuário está logado, adiciona a classe 'logged-in' ao body
        document.body.classList.add('logged-in');
        
        // Inicializa o chat
        initializeChat();
        
        // Adiciona os listeners para detectar quando o usuário sair
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handleBeforeUnload);
        
        // Configura o botão de logout
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            // Remove event listeners antigos para evitar duplicação
            const newLogoutButton = logoutButton.cloneNode(true);
            logoutButton.replaceWith(newLogoutButton);
            // Adiciona o novo event listener
            newLogoutButton.addEventListener('click', handleLogout);
            newLogoutButton.style.display = 'flex';
        }
        
                // Atualiza o status para online quando o usuário fizer login
        updateUserStatus('online');
        
        // Re-inicializa o MutationObserver para garantir que está funcionando
        if (!observer) {
            observer = initializeMutationObserver();
        }
    } else {
        // Usuário deslogado, remove a classe 'logged-in' do body
        document.body.classList.remove('logged-in');
        
        // Esconde o botão de logout
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
        
        // Redireciona para a página inicial se estiver na página de chat
        if (window.location.pathname.includes('chat.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Variável global para armazenar o ID do chat atual
let currentChatId = null;
let unreadCount = 0;

// Elementos da UI
const chatButton = document.getElementById('chatButton');
const chatModal = document.getElementById('chatModal');
const conversationModal = document.getElementById('conversationModal');
let chatList = document.getElementById('chatList'); 
const contactsList = document.getElementById('contactsList');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const conversationMessages = document.getElementById('conversationMessages');
const unreadMessagesBadge = document.getElementById('unreadMessagesBadge');
const chatSearch = document.getElementById('chatSearch');
// Referências a grupos removidas

// Inicialização do chat
function initChat() {
    console.log('[initChat] Iniciando chat...');
    
    // Verifica se o elemento chatList foi encontrado
    if (!chatList) {
        console.error('[initChat] ERRO: Elemento chatList não encontrado no DOM');
        return false;
    }
    
    console.log('[initChat] Elemento chatList encontrado:', chatList);
    console.log('[initChat] Número de filhos em chatList:', chatList.children.length);
    
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[DOMContentLoaded] DOM carregado, inicializando chat...');
    
    // Tenta inicializar o chat
    const initialized = initChat();
    
    if (initialized) {
        console.log('[DOMContentLoaded] Chat inicializado com sucesso');
    } else {
        console.error('[DOMContentLoaded] Falha ao inicializar o chat');
        
        // Tenta novamente após um curto atraso, caso o elemento ainda não esteja disponível
        setTimeout(() => {
            console.log('[DOMContentLoaded] Tentando novamente inicializar o chat...');
            const retryInitialized = initChat();
            
            if (!retryInitialized) {
                console.error('[DOMContentLoaded] Falha ao inicializar o chat após tentativa de recuperação');
                
                // Exibe mensagem de erro para o usuário
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    chatContainer.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Erro ao carregar o chat</p>
                            <p class="hint">Por favor, recarregue a página e tente novamente</p>
                        </div>
                    `;
                }
            }
        }, 1000);
    }

    // Verifica autenticação do usuário
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await initializeChat();
        } else {
            // Esconde o botão de chat se o usuário não estiver logado
            chatButton.style.display = 'none';
        }
    });

    // Event Listeners
    chatButton.addEventListener('click', toggleChatModal);
    document.querySelector('.close-chat').addEventListener('click', () => {
        chatModal.classList.remove('active');
    });

    document.querySelector('.back-to-chats').addEventListener('click', () => {
        conversationModal.classList.remove('active');
        chatModal.classList.add('active');
    });

    // Enviar mensagem ao pressionar Enter
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    sendMessageBtn.addEventListener('click', sendMessage);

    // Trocar entre abas
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // 🔔 Event listener para ativar notificações
    const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
    if (enableNotificationsBtn) {
        enableNotificationsBtn.addEventListener('click', async () => {
            const granted = await requestNotificationPermission();
            if (granted) {
                alert('✅ Notificações ativadas! Você receberá notificações de novas mensagens.');
                // Esconde o botão após ativar
                enableNotificationsBtn.style.display = 'none';
            } else {
                alert('⚠️ Permissão negada. Ative notificações nas configurações do navegador.');
            }
        });
        
        // Esconde o botão se já tiver permissão
        if (Notification.permission === 'granted') {
            enableNotificationsBtn.style.display = 'none';
        }
    }

    // Event listeners de grupos removidos
});

// Inicializa o chat
async function initializeChat() {
    // Atualiza o status do usuário para online
    await updateUserStatus('online');
    
    // 🔔 Inicializa o sistema de notificações
    if (currentUser && currentUser.uid) {
        await initializeNotifications(db, currentUser.uid);
    }
    
    // Carrega as conversas
    loadChats();
    
    // Carrega os contatos
    loadContacts();
    
    // Configura listeners em tempo real
    setupRealtimeListeners();
    
    // Mostra o botão de chat
    chatButton.style.display = 'flex';
}

// Atualiza o status do usuário no Firestore
async function updateUserStatus(status) {
    if (!currentUser) return;
    
    try {
        const statusRef = doc(db, 'chat_status', currentUser.uid);
        const statusData = {
            userId: currentUser.uid,
            status: status,
            isOnline: status === 'online',
            lastSeen: serverTimestamp(),
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
            email: currentUser.email || '',
            updatedAt: serverTimestamp()
        };
        
        // Adiciona a foto do perfil, se disponível
        if (currentUser.photoURL) {
            statusData.photoURL = currentUser.photoURL;
        }
        
        // Força a atualização do documento mesmo que os campos sejam os mesmos
        await setDoc(statusRef, {
            ...statusData,
            _updatedAt: new Date().toISOString() // Campo adicional para forçar atualização
        }, { merge: true });
        return true;
    } catch (error) {
        return false;
    }
}

// Carrega as conversas do usuário
async function loadChats() {
    console.log('[loadChats] Iniciando carregamento de conversas...');
    
    if (!currentUser) {
        console.error('[loadChats] Erro: Usuário não autenticado');
        return;
    }
    
    console.log('Carregando conversas para o usuário:', currentUser.uid);
    
    try {
        // Busca as conversas onde o usuário atual é um participante
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('participants', 'array-contains', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`[loadChats] Encontradas ${querySnapshot.size} conversas`);
        
        // Log detalhado das conversas encontradas
        querySnapshot.forEach((doc) => {
            console.log(`[loadChats] Conversa encontrada (ID: ${doc.id}):`, doc.data());
        });
        
        if (querySnapshot.empty) {
            console.log('Nenhuma conversa encontrada');
            chatList.innerHTML = `
                <div class="no-chats">
                    <i class="fas fa-comment-slash"></i>
                    <p>Nenhuma conversa recente</p>
                    <p class="hint">Inicie uma nova conversa clicando em um contato</p>
                </div>
            `;
            return;
        }
        
        // Limpa a lista de conversas
        chatList.innerHTML = '';
        
        // Processa cada conversa encontrada
        const chats = [];
        querySnapshot.forEach((doc) => {
            const chat = { id: doc.id, ...doc.data() };
            console.log('Conversa encontrada:', chat);
            chats.push(chat);
        });
        
        // Ordena as conversas por data da última mensagem (mais recente primeiro)
        chats.sort((a, b) => {
            const timeA = a.lastMessageAt?.toDate()?.getTime() || a.updatedAt?.toDate()?.getTime() || 0;
            const timeB = b.lastMessageAt?.toDate()?.getTime() || b.updatedAt?.toDate()?.getTime() || 0;
            return timeB - timeA;
        });
        
        // Adiciona as conversas à lista
        console.log(`[loadChats] Adicionando ${chats.length} conversas à lista`);
        
        chats.forEach(chat => {
            console.log(`[loadChats] Criando elemento para chat ${chat.id}`);
            const chatElement = createChatElement(chat);
            if (chatElement) {
                console.log(`[loadChats] Adicionando elemento do chat ${chat.id} ao DOM`);
                chatList.appendChild(chatElement);
            } else {
                console.error(`[loadChats] Falha ao criar elemento para o chat ${chat.id}`);
            }
        });
        
        console.log(`[loadChats] Total de elementos filhos em chatList:`, chatList.children.length);
        
    } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        chatList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar conversas</p>
                <p class="hint">${error.message}</p>
            </div>
        `;
    }
}

// Carrega os contatos do usuário
async function loadContacts() {
    if (!currentUser) return;
    
    try {
        // Mostra um indicador de carregamento
        contactsList.innerHTML = `
            <div class="loading-contacts">
                <div class="spinner"></div>
                <p>Carregando contatos...</p>
            </div>
        `;
        
        // Primeiro, busca o ID do usuário na coleção 'people' usando o email
        const usersRef = collection(db, 'people');
        const q = query(usersRef, where('email', '==', currentUser.email));
        const userSnapshot = await getDocs(q);
        
        let currentUserId = currentUser.uid; // ID padrão do Firebase Auth
        
        // Se encontrou o usuário na coleção 'people', usa o ID do documento
        if (!userSnapshot.empty) {
            currentUserId = userSnapshot.docs[0].id;
            console.log(`[loadContacts] ID do usuário atual: ${currentUserId}`);
        }
        
        // Busca todos os usuários da coleção 'people' ordenados por nome
        const querySnapshot = await getDocs(query(
            collection(db, 'people'),
            orderBy('name')
        ));
        
        if (querySnapshot.empty) {
            contactsList.innerHTML = `
                <div class="no-contacts">
                    <i class="fas fa-user-friends"></i>
                    <p>Nenhum contato encontrado</p>
                </div>
            `;
            return;
        }
        
        // Limpa a lista de contatos
        contactsList.innerHTML = '';
        
        // Mapa para armazenar os contatos por email (para facilitar a busca)
        const contactsMap = new Map();
        
        // Adiciona cada usuário como um contato
        querySnapshot.forEach(async (doc) => {
            const userData = doc.data();
            const userId = doc.id;
            const userEmail = userData.email?.toLowerCase() || '';
            
            // Verifica se é o próprio usuário atual
            const isCurrentUser = currentUser && 
                                (userEmail === currentUser.email?.toLowerCase() || 
                                 userId === currentUser.uid || 
                                 doc.id === currentUser.uid);
            
            // Se for o próprio usuário, não adiciona na lista de contatos
            if (isCurrentUser) {
            // ✅ Mantém o UID real do Firebase Auth
            currentUser = {
            ...currentUser,
            displayName: userData.name || currentUser.displayName,
            photoURL: userData.photoURL || userData.photoBase64 || currentUser.photoURL
            };

    // Garante que a coleção "people" tem o campo uid preenchido corretamente
            const userRef = doc(db, 'people', userId);
            await setDoc(userRef, { uid: currentUser.uid }, { merge: true });

                return; // Pula para o próximo contato
            }

            
            // Verifica se o contato tem UID válido
            if (!userId) {
                console.warn(`Contato ${userData.name || userEmail} não possui UID válido e será ignorado`);
                return; // Pula contatos sem UID
            }
            
            // Usa o UID do Firebase Auth se disponível, senão usa o ID do documento
            const contactUid = userData.uid || userId;
            
            const contact = {
                id: contactUid, // Usa o UID como ID principal
                userId: contactUid, // Garante que o UID esteja disponível como userId
                displayName: userData.name || 'Sem nome',
                email: userEmail,
                ramal: userData.extension || userData.ramal || 'Sem ramal',
                sector: userData.sector || 'Setor não informado',
                unit: userData.unit || '',
                status: 'offline', // Status inicial sempre offline
                photoURL: userData.photoURL || userData.photoUrl || '',
                photoBase64: userData.photoBase64 || ''
            };
            
            // Armazena o contato no mapa usando o email como chave
            contactsMap.set(userEmail, contact);
            
            const contactElement = createContactElement(contact);
            // Adiciona o ID do usuário como atributo de dados
            contactElement.setAttribute('data-user-id', contact.userId);
            contactsList.appendChild(contactElement);
            
        });
        
        // Depois de carregar todos os contatos, carrega os status online e ordena
        loadOnlineStatuses(contactsMap);
        
        // Ordena os contatos após carregar todos
        setTimeout(() => sortContactsByStatus(), 500); // Pequeno delay para garantir que todos os status foram carregados
        
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
        contactsList.innerHTML = `
            <div class="error-loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar contatos</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Carrega os status online dos usuários
async function loadOnlineStatuses(contactsMap = null) {
    if (!currentUser) return;
    
    try {
        const statusSnapshot = await getDocs(collection(db, 'chat_status'));
        
        // Mapa para armazenar os status por email (para facilitar a busca)
        const statusByEmail = new Map();
        
        // Primeiro, processa todos os status
        statusSnapshot.forEach((doc) => {
            const statusData = doc.data();
            const userId = doc.id;
            const userEmail = statusData.email?.toLowerCase() || '';
            
            // Armazena o status por ID de usuário e por email
            if (userEmail) {
                statusByEmail.set(userEmail, statusData);
            }
            
            // Se tivermos o ID do usuário, também armazenamos por ID
            if (statusData.userId) {
                statusByEmail.set(statusData.userId, statusData);
            }
            
            // Também armazenamos pelo ID do documento
            statusByEmail.set(userId, statusData);
            
            console.log(`[loadOnlineStatuses] Status carregado: ${statusData.displayName || 'Sem nome'} (ID: ${userId}, Status: ${statusData.status}, Email: ${userEmail})`);
        });
        
        // Se não tivermos um mapa de contatos, usamos a abordagem antiga
        if (!contactsMap) {
            console.log('[loadOnlineStatuses] Nenhum mapa de contatos fornecido, usando abordagem antiga');
            statusSnapshot.forEach((doc) => {
                const statusData = doc.data();
                // Não atualiza o status do próprio usuário
                if (statusData.userId !== currentUser.uid) {
                    updateContactStatus(statusData.userId, statusData.status);
                }
            });
            return;
        }
        
        let statusUpdated = 0;
        
        for (const [email, contact] of contactsMap.entries()) {
            // Tenta encontrar o status por email primeiro
            let statusData = statusByEmail.get(email);
            
            // Se não encontrou por email, tenta pelo ID do usuário
            if (!statusData && contact.userId) {
                statusData = statusByEmail.get(contact.userId);
            }
            
            // Se encontrou um status, atualiza o contato
            if (statusData) {
                updateContactStatus(contact.userId, statusData.status);
                statusUpdated++;
            } else {
                // Define como offline se não encontrar o status
                updateContactStatus(contact.userId, 'offline');
            }
        }
        
    } catch (error) {
        console.error('[loadOnlineStatuses] Erro ao carregar status online:', error);
    }
}

// Configura listeners em tempo real
let chatListListener = null;
let unsubscribeStatus = null;


function setupRealtimeListeners() {
    // Remove o listener anterior se existir
    if (chatListListener) {
        chatListListener();
    }
    
    if (!currentUser) return;
    
    // Listener otimizado para lista de chats
    const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('updatedAt', 'desc')
);

    chatListListener = onSnapshot(chatsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const chatData = { id: change.doc.id, ...change.doc.data() };

            if (change.type === 'added') {
                // Adiciona apenas se ainda não existe
                if (!document.getElementById(`chat-${chatData.id}`)) {
                    const chatElement = createChatElement(chatData);
                    chatList.prepend(chatElement);
                }
            } 
            else if (change.type === 'modified') {
                // Atualiza apenas o preview e badge
                const chatEl = document.getElementById(`chat-${chatData.id}`);
                if (chatEl) {
                    const lastMsgEl = chatEl.querySelector('.chat-last-message');
                    const timeEl = chatEl.querySelector('.chat-time');
                    const unreadBadge = chatEl.querySelector('.unread-badge');

                    if (lastMsgEl) lastMsgEl.textContent = chatData.lastMessage || '';
                    if (timeEl && chatData.updatedAt) {
                        const date = chatData.updatedAt.toDate ? chatData.updatedAt.toDate() : new Date(chatData.updatedAt);
                        timeEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }

                    const unread = chatData.unreadCounts?.[currentUser.uid] || 0;
                    if (unreadBadge) {
                        unreadBadge.textContent = unread;
                        unreadBadge.style.display = unread > 0 ? 'flex' : 'none';
                    }
                }
            } 
            else if (change.type === 'removed') {
                const el = document.getElementById(`chat-${chatData.id}`);
                if (el) el.remove();
            }
        });
    }, (error) => {
        console.error('Erro no listener de chats:', error);
    });


    if (!currentUser) return;
    
    console.log('[setupRealtimeListeners] Configurando listeners em tempo real...');
    
    // Mapa para armazenar os status por ID de usuário e email
    const statusMap = new Map();
    
    // Listener para atualizações de status dos contatos
    const statusRef = collection(db, 'chat_status');
    unsubscribeStatus = onSnapshot(statusRef, (snapshot) => {
        console.log(`[setupRealtimeListeners] Atualização de status recebida: ${snapshot.docChanges().length} alterações`);
        
        snapshot.docChanges().forEach((change) => {
            const statusData = change.doc.data();
            const docId = change.doc.id;
            const userId = statusData.userId || docId;
            const userEmail = statusData.email?.toLowerCase() || '';
            
            // Atualiza o mapa de status
            if (userId) statusMap.set(userId, statusData);
            if (userEmail) statusMap.set(userEmail, statusData);
            
            console.log(`[setupRealtimeListeners] Status atualizado: ${statusData.displayName || 'Sem nome'} (ID: ${userId}, Email: ${userEmail}, Status: ${statusData.status})`);
            
            // Não atualiza o status do próprio usuário
            if (userId === currentUser.uid) {
                console.log('[setupRealtimeListeners] Ignorando atualização de status do próprio usuário');
                return;
            }
            
            // Atualiza o status do contato
            updateContactStatus(userId, statusData.status || 'offline');
            
            // Se tivermos o email, também tentamos atualizar por email
            if (userEmail) {
                // Encontra todos os elementos de contato com este email
                const contactItems = document.querySelectorAll('.contact-item, .chat-item');
                contactItems.forEach(item => {
                    const itemEmail = item.getAttribute('data-email')?.toLowerCase();
                    if (itemEmail === userEmail) {
                        const itemUserId = item.getAttribute('data-user-id');
                        if (itemUserId && itemUserId !== userId) {
                            console.log(`[setupRealtimeListeners] Atualizando status por email: ${userEmail} (ID: ${itemUserId} -> ${userId})`);
                            updateContactStatus(itemUserId, statusData.status || 'offline');
                        }
                    }
                });
            }
        });
    }, (error) => {
        console.error('[setupRealtimeListeners] Erro no listener de status:', error);
    });
    
    // Retorna função para cancelar os listeners quando o usuário sair
    return () => {
        console.log('[setupRealtimeListeners] Removendo listeners em tempo real');
        if (typeof chatListListener === 'function') chatListListener();
        if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
    };

}

// Atualiza a lista de chats na interface
function updateChatList(chat) {
    if (!chat) return;
    
    console.log(`[updateChatList] Atualizando lista de chats para o chat: ${chat.id}`, chat);
    
    const chatList = document.getElementById('chatList');
    if (!chatList) {
        console.error('[updateChatList] Elemento chatList não encontrado');
        return;
    }
    
    // Verifica se o chat já existe na lista
    let chatElement = document.querySelector(`.chat-item[data-chat-id="${chat.id}"]`);
    
    if (!chatElement) {
        // Se não existir, cria um novo elemento
        chatElement = createChatElement(chat);
        if (chatElement && !document.getElementById(`chat-${chat.id}`)) {
    chatList.prepend(chatElement);
        }
    } else {
        // Se existir, atualiza os dados
        const lastMessage = chat.lastMessage || 'Nenhuma mensagem';
        const timeAgo = chat.lastMessageTime ? formatTimeAgo(chat.lastMessageTime.toDate()) : '';
        
        const nameElement = chatElement.querySelector('.contact-name');
        const messageElement = chatElement.querySelector('.contact-last-message');
        const timeElement = chatElement.querySelector('.contact-time');
        const unreadBadge = chatElement.querySelector('.unread-badge');
        
        if (nameElement) nameElement.textContent = chat.otherUserName || 'Usuário desconhecido';
        if (messageElement) messageElement.textContent = lastMessage;
        if (timeElement) timeElement.textContent = timeAgo;
        
        // Atualiza o badge de mensagens não lidas
        if (unreadBadge) {
            if (chat.unreadCount && chat.unreadCount > 0) {
                unreadBadge.textContent = chat.unreadCount > 9 ? '9+' : chat.unreadCount;
                unreadBadge.style.display = 'flex';
            } else {
                unreadBadge.style.display = 'none';
            }
        }
        
        console.log(`[updateChatList] Chat atualizado na lista: ${chat.id}`);
    }
    
    // Ordena os chats pelo horário da última mensagem (mais recentes primeiro)
    sortChatList();
}

// Exibe uma notificação para o usuário
function showNotification(type, title, message) {
    // Verifica se o SweetAlert2 está disponível
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        
        Toast.fire({
            icon: type,
            title: title,
            text: message
        });
    } else {
        // Fallback para alerta padrão se o SweetAlert2 não estiver disponível
        alert(`${title}: ${message}`);
    }
}

// Função auxiliar para formatar o tempo decorrido
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffInSeconds < 604800) return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Função para ordenar a lista de chats
function sortChatList() {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;
    
    const chats = Array.from(chatList.querySelectorAll('.chat-item'));
    
    chats.sort((a, b) => {
        const timeA = a.getAttribute('data-last-message-time') || '0';
        const timeB = b.getAttribute('data-last-message-time') || '0';
        return parseInt(timeB) - parseInt(timeA); // Ordem decrescente (mais recente primeiro)
    });
    
    // Reorganiza os elementos na DOM
    chats.forEach(chat => chat.remove());
    chats.forEach(chat => chatList.appendChild(chat));
}

// Cria um elemento de chat para a lista
function createChatElement(chat) {
    console.log('[createChatElement] Iniciando criação do elemento para o chat:', chat?.id);
    
    if (!chat || !chat.id) {
        console.error('[createChatElement] Erro: Chat inválido:', chat);
        return null;
    }
    
    // Verifica se o elemento chatList existe
    if (!chatList) {
        console.error('[createChatElement] Erro: Elemento chatList não encontrado no DOM');
        return null;
    }
    
    const element = document.createElement('div');
    element.className = 'chat-item';
    element.dataset.chatId = chat.id;
    
    // Obtém o ID do outro participante (não o usuário atual)
    const otherParticipantId = chat.participants?.find(id => id !== currentUser?.uid);
    const participantDetails = chat.participantDetails || {};
    const otherUser = participantDetails[otherParticipantId] || {};
    
    // Define o nome do chat (nome do contato)
    let chatName = 'Contato';
    if (otherUser && otherUser.name) {
        chatName = otherUser.name;
    } else if (chat.withName) {
        chatName = chat.withName;
    } else if (chat.participantNames && chat.participantNames.length > 0) {
        // Tenta obter o nome do primeiro participante que não seja o usuário atual
        const otherParticipantName = Object.entries(chat.participantNames || {})
            .find(([id, name]) => id !== currentUser?.uid);
        if (otherParticipantName) {
            chatName = otherParticipantName[1];
        }
    }
    
    // Obtém a última mensagem e formata o horário
    const lastMessage = chat.lastMessage || 'Nenhuma mensagem';
    const lastMessageTime = chat.lastMessageAt?.toDate() || chat.updatedAt?.toDate() || new Date();
    const time = formatTimeAgo(lastMessageTime);
    
    // Verifica se há mensagens não lidas
    const unreadCount = chat.unreadCounts?.[currentUser?.uid] || 0;
    const unreadBadge = unreadCount > 0 
        ? `<span class="unread-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` 
        : '';
    
    // Obtém a foto do contato ou usa uma foto padrão
    let photoUrl = 'https://via.placeholder.com/50';
    
    // Tenta obter a foto do outro participante
    if (otherUser) {
        photoUrl = otherUser.photoURL || otherUser.photoBase64 || photoUrl;
    } else if (chat.participantPhotos && chat.participantPhotos[otherParticipantId]) {
        photoUrl = chat.participantPhotos[otherParticipantId];
    }
    
    // Gera as iniciais para exibir quando não houver imagem
    const initials = getInitials(chatName);
    
    // Cria o HTML do item de chat
    element.innerHTML = `
        <div class="chat-avatar">
            ${(photoUrl && photoUrl.startsWith('data:') || photoUrl.startsWith('http')) 
                ? `<img src="${photoUrl}" alt="${chatName}" onerror="this.parentNode.innerHTML = '<div class=\'avatar-initials\'>${initials}</div>'">` 
                : `<div class="avatar-initials">${initials}</div>`
            }
        </div>
        <div class="chat-info">
            <div class="chat-header">
                <span class="chat-name">${escapeHtml(chatName)}</span>
                <span class="chat-time">${time}</span>
            </div>
            <div class="chat-preview">
                <span class="chat-last-message">${escapeHtml(lastMessage)}</span>
                ${unreadBadge}
            </div>
        </div>
    `;
    
    // Adiciona o evento de clique para abrir o chat
    element.addEventListener('click', () => {
        console.log(`[createChatElement] Clique no chat ${chat.id}`);
        openChat(chat);
    });
    
    // Define o atributo de data para ordenação
    element.setAttribute('data-last-message-time', lastMessageTime.getTime());
    
    console.log(`[createChatElement] Elemento criado com sucesso para o chat ${chat.id}`);
    return element;
}
// Cria um elemento de contato para a lista
function createContactElement(contact) {
    const element = document.createElement('div');
    const isUnavailable = contact.status === 'unavailable' || !contact.email;
    
    // Adiciona classes condicionais baseadas no status
    element.className = `contact-item ${isUnavailable ? 'unavailable-contact' : ''}`;
    element.dataset.contactId = contact.id;
    
    // Prepara o avatar (foto ou iniciais)
    let avatarContent = '';
    if (contact.photoBase64) {
        avatarContent = `<img src="${contact.photoBase64}" alt="${contact.displayName}" class="contact-avatar-img">`;
    } else if (contact.photoURL) {
        avatarContent = `<img src="${contact.photoURL}" alt="${contact.displayName}" class="contact-avatar-img">`;
    } else {
        avatarContent = getInitials(contact.displayName);
    }
    
    // Adiciona um ícone de cadeado para contatos sem chat
    const lockIcon = !contact.email ? '<i class="fas fa-lock" title="Apenas ramal"></i>' : '';
    
    // Prepara as informações adicionais
    const additionalInfo = [];
    if (contact.sector) additionalInfo.push(`<div class="contact-sector">${contact.sector}</div>`);
    if (contact.unit) additionalInfo.push(`<div class="contact-unit">${contact.unit}</div>`);
    if (contact.ramal) additionalInfo.push(`<div class="contact-ramal">Ramal: ${contact.ramal}</div>`);
    
    element.innerHTML = `
        <div class="contact-avatar ${isUnavailable ? 'unavailable' : ''}">
            ${avatarContent}
        </div>
        <div class="contact-info">
            <div class="contact-name">${contact.displayName} ${lockIcon}</div>
            ${additionalInfo.join('')}
        </div>
        <div class="status-indicator status-${contact.status}" 
             title="${contact.status === 'available' ? 'Disponível' : 'Indisponível'}">
        </div>
    `;
    
    // Só adiciona o evento de clique se o contato não estiver indisponível
    if (!isUnavailable && contact.email) {
        element.style.cursor = 'pointer';
        element.addEventListener('click', () => startNewChat(contact));
    } else {
        element.style.cursor = 'not-allowed';
    }
    
    return element;
}

// Abre o chat com um contato
async function openChat(chat) {
    console.log('Abrindo chat com:', chat);
    currentChatId = chat.id;
    
    // Atualiza a UI para mostrar a conversa
    const chatModal = document.getElementById('chatModal');
    const conversationModal = document.getElementById('conversationModal');
    
    if (chatModal && conversationModal) {
        chatModal.classList.remove('active');
        conversationModal.classList.add('active');
    }
    
    // Obtém o elemento do avatar, título e botão de fechar
    const conversationTitle = document.getElementById('conversationTitle');
    const conversationAvatar = document.getElementById('conversationAvatar');
    const backButton = document.getElementById('backToChatList');
    const conversationHeader = document.querySelector('.conversation-header');
    
    // Define o ID do usuário no cabeçalho da conversa para referência futura
    if (conversationHeader && chat.userId) {
        conversationHeader.setAttribute('data-user-id', chat.userId);
    }
    
    // Garante que o botão de fechar esteja presente no cabeçalho, ao lado dos três pontinhos
    if (conversationHeader) {
        // Remove qualquer botão de fechar existente
        const existingCloseBtn = conversationHeader.querySelector('.close-conversation');
        if (existingCloseBtn) {
            existingCloseBtn.remove();
        }
        
        // Encontra o contêiner de ações (onde ficam os três pontinhos)
        let actionsContainer = conversationHeader.querySelector('.conversation-actions');
        
        // Se não existir o contêiner de ações, cria um
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'conversation-actions';
            actionsContainer.style.display = 'flex';
            actionsContainer.style.alignItems = 'center';
            actionsContainer.style.gap = '10px';
            conversationHeader.appendChild(actionsContainer);
        }
        
        // Cria o botão de fechar
        const closeButton = document.createElement('button');
        closeButton.className = 'close-conversation';
        closeButton.innerHTML = '&times;';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = '#666';
        closeButton.style.padding = '5px 10px';
        closeButton.style.borderRadius = '50%';
        closeButton.style.transition = 'background 0.2s';
        closeButton.style.lineHeight = '1';
        closeButton.style.display = 'flex';
        closeButton.style.alignItems = 'center';
        closeButton.style.justifyContent = 'center';
        closeButton.style.width = '36px';
        closeButton.style.height = '36px';
        closeButton.onmouseover = () => {
            closeButton.style.background = '#f0f0f0';
            closeButton.style.color = '#333';
        };
        closeButton.onmouseout = () => {
            closeButton.style.background = 'none';
            closeButton.style.color = '#666';
        };
        
        // Insere o botão de fechar antes dos três pontinhos
        actionsContainer.insertBefore(closeButton, actionsContainer.firstChild);
    }
    
    // Configura o botão de voltar
    const setupBackButton = (element) => {
        if (element) {
            element.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (conversationModal) {
                    conversationModal.classList.remove('active');
                }
                if (chatModal) {
                    chatModal.classList.add('active');
                }
                currentChatId = null;
                
                // Força o redesenho para garantir que a transição seja suave
                if (conversationModal) {
                    conversationModal.style.display = 'none';
                    setTimeout(() => {
                        conversationModal.style.display = '';
                    }, 10);
                }
            };
        }
    };
    
    // Configura tanto o botão de voltar quanto o botão de fechar
    setupBackButton(backButton);
    setupBackButton(document.querySelector('.back-to-chats'));
    setupBackButton(document.querySelector('.close-conversation'));
    
    // Obtém o nome do contato (pode vir de várias fontes)
    let contactName = 'Chat';
    
    // Tenta obter o nome do outro participante (não o usuário atual)
    if (chat.participantDetails) {
        // Encontra o ID do outro participante
        const otherParticipantId = Object.keys(chat.participantDetails).find(id => id !== currentUser.uid);
        if (otherParticipantId && chat.participantDetails[otherParticipantId]) {
            contactName = chat.participantDetails[otherParticipantId].name || 
                         chat.participantDetails[otherParticipantId].displayName || 
                         chat.withName || 
                         'Contato';
        }
    } else if (chat.withName) {
        // Se não tiver participantDetails, usa o withName se existir
        contactName = chat.withName;
    } else if (chat.participantNames && chat.participantNames.length > 0) {
        // Se não tiver withName, tenta pegar o primeiro nome da lista de participantes
        // que não seja o usuário atual
        const otherParticipantName = chat.participantNames.find(name => 
            !name.includes(currentUser.displayName) && 
            !name.includes(currentUser.email?.split('@')[0])
        );
        if (otherParticipantName) {
            contactName = otherParticipantName;
        } else {
            // Se não encontrar, usa o primeiro nome da lista
            contactName = chat.participantNames[0];
        }
    }
    
    // Atualiza o título da conversa
    if (conversationTitle) {
        conversationTitle.textContent = contactName;
    }
    
    // Tenta obter a foto de diferentes fontes
    let contactPhoto = '';
    let otherParticipantId = null;
    
    // Encontra o ID do outro participante
    if (chat.participantDetails) {
        otherParticipantId = Object.keys(chat.participantDetails).find(id => id !== currentUser.uid);
        if (otherParticipantId && chat.participantDetails[otherParticipantId]) {
            contactPhoto = chat.participantDetails[otherParticipantId].photoURL || 
                          chat.participantDetails[otherParticipantId].photoBase64 || 
                          '';
        }
    }
    
    // Se não encontrou a foto nos participantDetails, tenta outras fontes
    if (!contactPhoto) {
        contactPhoto = chat.withPhoto || chat.photoURL || chat.photoBase64 || '';
    }
    
    // Atualiza o avatar
    if (conversationAvatar) {
        // Adiciona a classe conversation-avatar ao elemento do avatar
        conversationAvatar.className = 'conversation-avatar';
        
        if (contactPhoto) {
            // Se houver uma foto de perfil, usa-a
            conversationAvatar.innerHTML = `
                <img src="${contactPhoto}" alt="${contactName}" class="chat-avatar-img" onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\'avatar-initials\'>${getInitials(contactName)}</div>'">
            `;
        } else {
            // Se não houver foto, usa as iniciais
            conversationAvatar.innerHTML = `
                <div class="avatar-initials">${getInitials(contactName)}</div>
            `;
        }
        
        // Adiciona o status online/offline ao lado do nome
        const statusContainer = document.createElement('div');
        statusContainer.style.display = 'flex';
        statusContainer.style.alignItems = 'center';
        statusContainer.style.gap = '8px';
        statusContainer.className = 'status-container';
        statusContainer.setAttribute('data-user-id', chat.userId || '');
        
        // Cria o indicador de status
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator';
        statusIndicator.style.position = 'static';
        statusIndicator.style.transform = 'none';
        statusIndicator.style.margin = '0';
        
        // Remove o status duplicado do cabeçalho
        const conversationStatus = document.querySelector('.conversation-status');
        if (conversationStatus) {
            conversationStatus.remove();
        }
        
        // Encontra o container do título para adicionar o status
        const titleContainer = conversationTitle?.parentElement;
        if (!titleContainer) return;
        
        // Remove qualquer status anterior
        const oldStatusContainer = titleContainer.querySelector('.status-container');
        if (oldStatusContainer) {
            oldStatusContainer.remove();
        }
        
        // Cria o texto de status
        const statusText = document.createElement('span');
        statusText.className = 'status-text';
        statusText.style.fontSize = '0.8em';
        statusText.style.color = '#666';
        
        // Função para atualizar o status
        const updateStatusUI = (status) => {
            const isOnline = status === 'online';
            statusIndicator.className = `status-indicator status-${isOnline ? 'online' : 'offline'}`;
            statusIndicator.title = isOnline ? 'Online' : 'Offline';
            statusText.textContent = isOnline ? 'Online' : 'Offline';
        };
        
        // Remove qualquer listener de status anterior
        if (window.statusUnsubscribe) {
            window.statusUnsubscribe();
            window.statusUnsubscribe = null;
        }
        
        // Tenta obter o status atual do usuário
        const getCurrentStatus = async () => {
            try {
                // Usa o otherParticipantId se disponível, senão tenta chat.userId
                const targetUserId = otherParticipantId || chat.userId;
                
                if (targetUserId) {
                    // Configura o listener em tempo real para o status
                    const statusRef = doc(db, 'chat_status', targetUserId);
                    
                    // Pega o status atual primeiro
                    const statusDoc = await getDoc(statusRef);
                    if (statusDoc.exists()) {
                        const statusData = statusDoc.data();
                        updateStatusUI(statusData.status || 'offline');
                    } else {
                        updateStatusUI('offline');
                    }
                    
                    // Configura o listener para atualizações em tempo real
                    const unsubscribe = onSnapshot(statusRef, (doc) => {
                        if (doc.exists()) {
                            const statusData = doc.data();
                            updateStatusUI(statusData.status || 'offline');
                        } else {
                            updateStatusUI('offline');
                        }
                    }, (error) => {
                        console.error('Erro no listener de status:', error);
                    });
                    
                    // Armazena a função de unsubscribe globalmente para podermos limpar depois
                    window.statusUnsubscribe = unsubscribe;
                    
                    // Retorna a função para cancelar o listener quando não for mais necessário
                    return unsubscribe;
                }
                
                // Se não encontrar pelo ID, tenta pelo email
                if (chat.withEmail) {
                    const statusQuery = query(
                        collection(db, 'chat_status'),
                        where('email', '==', chat.withEmail.toLowerCase())
                    );
                    const statusSnapshot = await getDocs(statusQuery);
                    if (!statusSnapshot.empty) {
                        const statusData = statusSnapshot.docs[0].data();
                        updateStatusUI(statusData.status || 'offline');
                        return;
                    }
                }
                
                // Se não encontrar, usa o status do chat ou define como offline
                updateStatusUI(chat.status || 'offline');
                
            } catch (error) {
                console.error('Erro ao buscar status do usuário:', error);
                updateStatusUI(chat.status || 'offline');
            }
        };
        
        // Busca o status atual
        getCurrentStatus();
        
        // Configura um listener em tempo real para atualizações de status
        let unsubscribeStatus = () => {};
        if (chat.userId) {
            try {
                const statusRef = doc(db, 'chat_status', chat.userId);
                // Verifica se o nó pai existe antes de adicionar o observer
                const conversationHeader = document.querySelector('.conversation-header');
                if (!conversationHeader) {
                    console.warn('[openChat] Cabeçalho da conversa não encontrado para adicionar observer de status');
                    return;
                }
                
                unsubscribeStatus = onSnapshot(statusRef, (doc) => {
                    if (doc.exists()) {
                        const statusData = doc.data();
                        console.log(`[openChat] Atualização de status em tempo real para ${chat.withName}: ${statusData.status}`);
                        updateStatusUI(statusData.status || 'offline');
                    }
                }, (error) => {
                    console.error('Erro no listener de status em tempo real:', error);
                });
            } catch (error) {
                console.error('Erro ao configurar listener de status em tempo real:', error);
            }
        }
        
        // Adiciona os elementos ao container de status
        statusContainer.appendChild(statusIndicator);
        statusContainer.appendChild(statusText);
        
        // Adiciona o novo container de status
        titleContainer.appendChild(statusContainer);
        
        // Limpa o listener quando o chat for fechado
        const cleanup = () => {
            if (typeof unsubscribeStatus === 'function') {
                unsubscribeStatus();
            }
            document.removeEventListener('click', handleClose);
        };
        
        const handleClose = (e) => {
            if (e.target === backButton || e.target.closest('.close-conversation')) {
                cleanup();
            }
        };
        
        document.addEventListener('click', handleClose);
    }
    
    try {
        // Carrega as mensagens
        await loadMessages(chat.id);
        
        // Marca como lida
        await markAsRead(chat.id);
        
        // Atualiza o contador de não lidas
        updateUnreadCount(-(chat.unreadCount || 0));
        
        // Rola para a última mensagem
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
    }
}

// Encontra um chat existente com um usuário específico
async function findExistingChat(userId) {
    if (!userId) {
        console.error('ID de usuário inválido fornecido para findExistingChat');
        return null;
    }
    
    try {
        const chatsRef = collection(db, 'chats');
        // Busca apenas conversas individuais onde o usuário atual é um participante
        const q = query(
            chatsRef,
            where('participants', 'array-contains', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Usando 'docItem' em vez de 'doc' para evitar conflito com a função doc() do Firestore
        for (const docItem of querySnapshot.docs) {
            const chatData = { id: docItem.id, ...docItem.data() };
            
            // Verifica se o userId está na lista de participantes
            if (chatData.participants && chatData.participants.includes(userId)) {
                // Encontrou um chat existente com este usuário
                const otherParticipantId = chatData.participants.find(id => id !== currentUser.uid);
                
                // Tenta obter os detalhes do participante do chat primeiro
                let contactName = 'Contato';
                let contactPhoto = '';
                
                // Verifica se temos os detalhes do participante nos dados do chat
                if (chatData.participantDetails && chatData.participantDetails[otherParticipantId]) {
                    const details = chatData.participantDetails[otherParticipantId];
                    contactName = details.name || contactName;
                    contactPhoto = details.photoURL || details.photoBase64 || '';
                } 
                // Se não encontrou nos detalhes do chat, tenta buscar na coleção 'people'
                else {
                    try {
                        const contactDoc = await getDoc(doc(db, 'people', otherParticipantId));
                        if (contactDoc.exists()) {
                            const contactData = contactDoc.data();
                            contactName = contactData.name || contactName;
                            contactPhoto = contactData.photoURL || contactData.photoBase64 || '';
                        }
                    } catch (error) {
                        console.warn('Erro ao buscar detalhes do contato:', error);
                    }
                }
                
                // Tenta obter o nome do participante dos nomes do chat, se disponível
                if (chatData.participantNames && chatData.participants) {
                    const nameIndex = chatData.participants.indexOf(otherParticipantId);
                    if (nameIndex !== -1 && chatData.participantNames[nameIndex]) {
                        contactName = chatData.participantNames[nameIndex];
                    }
                }
                
                return {
                    id: chatData.id,
                    withId: otherParticipantId,
                    withName: contactName,
                    withPhoto: contactPhoto,
                    lastMessage: chatData.lastMessage,
                    timestamp: chatData.timestamp || 
                              (chatData.updatedAt ? 
                                  (typeof chatData.updatedAt.toDate === 'function' ? 
                                      chatData.updatedAt.toDate().toISOString() : 
                                      new Date(chatData.updatedAt).toISOString()) : 
                                  new Date().toISOString()),
                    unreadCount: chatData.unreadCounts?.[currentUser.uid] || 0,
                    // Inclui os detalhes completos para uso posterior
                    participants: chatData.participants || [],
                    participantDetails: chatData.participantDetails || {}
                };
            }
        }
        
        return null; // Nenhum chat existente encontrado
    } catch (error) {
        console.error('Erro ao buscar chat existente:', error);
        return null;
    }
}

// Ordena os contatos para que os online fiquem no topo
function sortContactsByStatus() {
    const contactsContainer = document.querySelector('.contacts-list');
    if (!contactsContainer) return;
    
    const contacts = Array.from(contactsContainer.querySelectorAll('.contact-item'));
    
    // Ordena os contatos: online primeiro, depois offline
    contacts.sort((a, b) => {
        const aIsOnline = a.querySelector('.status-indicator')?.classList.contains('status-online');
        const bIsOnline = b.querySelector('.status-indicator')?.classList.contains('status-online');
        
        if (aIsOnline && !bIsOnline) return -1;
        if (!aIsOnline && bIsOnline) return 1;
        return 0;
    });
    
    // Remove todos os contatos do container
    contacts.forEach(contact => contactsContainer.removeChild(contact));
    
    // Adiciona os contatos de volta na nova ordem
    contacts.forEach(contact => contactsContainer.appendChild(contact));
}

// Atualiza o status de um contato na interface
function updateContactStatus(userId, status) {
    try {
        
        // Verifica se o status é válido
        if (!['online', 'offline'].includes(status)) {
            console.warn(`[updateContactStatus] Status inválido para o usuário ${userId}:`, status);
            return;
        }
        
        // Atualiza o status na lista de contatos
        const contactItems = document.querySelectorAll(`.contact-item[data-user-id="${userId}"]`);
        
        contactItems.forEach((contactItem, index) => {
            if (!contactItem) {
                console.warn(`[updateContactStatus] Item de contato ${index} é nulo`);
                return;
            }
            
            // Atualiza o indicador de status
            let statusIndicator = contactItem.querySelector('.status-indicator');
            if (!statusIndicator) {
                // Se não houver um indicador de status, cria um
                statusIndicator = document.createElement('div');
                statusIndicator.className = 'status-indicator';
                contactItem.querySelector('.contact-avatar').appendChild(statusIndicator);
            }
            
            // Atualiza as classes do indicador
            statusIndicator.className = `status-indicator status-${status}`;
            statusIndicator.title = status === 'online' ? 'Online' : 'Offline';
            
            // Atualiza o texto de status, se houver
            const statusText = contactItem.querySelector('.contact-status');
            if (statusText) {
                statusText.textContent = status === 'online' ? 'Online' : 'Offline';
            }
            
            // Ordena os contatos após atualizar o status
            sortContactsByStatus();
        });
        
        // Atualiza o status na lista de conversas, se aplicável
        const chatItems = document.querySelectorAll(`.chat-item[data-user-id="${userId}"]`);
                
        chatItems.forEach((chatItem, index) => {
            if (!chatItem) {
                console.warn(`[updateContactStatus] Item de chat ${index} é nulo`);
                return;
            }
            
            // Atualiza o indicador de status no chat
            let statusIndicator = chatItem.querySelector('.status-indicator');
            if (!statusIndicator) {
                // Se não houver um indicador de status, cria um
                statusIndicator = document.createElement('div');
                statusIndicator.className = 'status-indicator';
                const chatInfo = chatItem.querySelector('.chat-info');
                if (chatInfo) {
                    chatInfo.appendChild(statusIndicator);
                }
            }
            
            // Atualiza as classes do indicador
            statusIndicator.className = `status-indicator status-${status}`;
            statusIndicator.title = status === 'online' ? 'Online' : 'Offline';
            
            // Atualiza o texto de status, se houver
            const statusText = chatItem.querySelector('.chat-status');
            if (statusText) {
                statusText.textContent = status === 'online' ? 'Online' : 'Offline';
            }
        });
        
        // Atualiza o status na janela de conversa ativa, se for o contato atual
        const conversationModal = document.getElementById('conversationModal');
                
        if (conversationModal && conversationModal.classList.contains('active') && currentChatId) {
            // Obtém o elemento do cabeçalho da conversa
            const conversationHeader = document.querySelector('.conversation-header');
            if (!conversationHeader) return;
            
            // Verifica se o ID do usuário corresponde ao ID do contato da conversa atual
            const currentChatElement = document.querySelector(`.chat-item[data-chat-id="${currentChatId}"]`);
            const currentChatUserId = currentChatElement ? currentChatElement.getAttribute('data-user-id') : null;
            
            // Verifica se o ID do usuário corresponde ao ID do contato da conversa atual
            if (currentChatUserId === userId) {
                console.log(`[updateContactStatus] Atualizando status no cabeçalho da conversa para: ${status}`);
                
                // Atualiza o indicador de status no cabeçalho da conversa
                let statusIndicator = conversationHeader.querySelector('.status-indicator');
                const statusText = conversationHeader.querySelector('.status-text');
                
                if (statusIndicator) {
                    statusIndicator.className = `status-indicator status-${status}`;
                    statusIndicator.title = status === 'online' ? 'Online' : 'Offline';
                } else {
                    console.warn('[updateContactStatus] Indicador de status não encontrado no cabeçalho');
                    
                    // Tenta criar o indicador de status se não existir
                    const titleContainer = conversationHeader.querySelector('.conversation-title')?.parentElement;
                    if (titleContainer) {
                        const newStatusContainer = document.createElement('div');
                        newStatusContainer.className = 'status-container';
                        newStatusContainer.style.display = 'flex';
                        newStatusContainer.style.alignItems = 'center';
                        newStatusContainer.style.gap = '5px';
                        newStatusContainer.style.marginTop = '3px';
                        
                        const newStatusIndicator = document.createElement('div');
                        newStatusIndicator.className = `status-indicator status-${status}`;
                        newStatusIndicator.title = status === 'online' ? 'Online' : 'Offline';
                        
                        const newStatusText = document.createElement('span');
                        newStatusText.className = 'status-text';
                        newStatusText.textContent = status === 'online' ? 'Online' : 'Offline';
                        newStatusText.style.fontSize = '0.8em';
                        newStatusText.style.color = '#666';
                        
                        newStatusContainer.appendChild(newStatusIndicator);
                        newStatusContainer.appendChild(newStatusText);
                        titleContainer.appendChild(newStatusContainer);
                    }
                }
                
                if (statusText) {
                    console.log(`[updateContactStatus] Atualizando texto de status: '${statusText.textContent}' -> '${status === 'online' ? 'Online' : 'Offline'}'`);
                    statusText.textContent = status === 'online' ? 'Online' : 'Offline';
                } else {
                    console.warn('[updateContactStatus] Texto de status não encontrado no cabeçalho');
                }
            }
        }
        
    } catch (error) {
    }
}

// Cria um novo chat com um contato
async function createNewChat(contact) {
    console.log('Criando novo chat com:', contact);
    
    if (!currentUser || !currentUser.uid) {
        console.error('Usuário não autenticado ou sem UID');
        return null;
    }
    
    // Valida se o contato tem UID válido
    if (!contact.userId) {
        console.error('Não é possível criar chat: contato não possui UID válido');
        showNotification('error', 'Erro', 'Este contato não está disponível para chat. Tente ligar para este contato.');
        return null;
    }
    
    try {
        // Verifica se já existe um chat com este contato
        const existingChat = await findExistingChat(contact.userId);
        if (existingChat) {
            console.log('Chat existente encontrado:', existingChat);
            return existingChat;
        }
        
        // Busca os dados mais recentes do contato
        let contactData = { ...contact };
        try {
            const contactDoc = await getDoc(doc(db, 'people', contact.userId));
            if (contactDoc.exists()) {
                const latestData = contactDoc.data();
                contactData = {
                    ...contactData,
                    displayName: latestData.name || contact.displayName,
                    email: latestData.email || contact.email,
                    photoURL: latestData.photoURL || latestData.photoBase64 || contact.photoURL || ''
                };
            }
        } catch (error) {
            console.warn('Não foi possível buscar dados atualizados do contato:', error);
        }
        
        // Cria um ID único para o chat
        const chatId = doc(collection(db, 'chats')).id;
        
        // Prepara os dados do chat com UIDs corretos
        const currentUserName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário';
        const contactName = contactData.displayName || contactData.email?.split('@')[0] || 'Contato';
        
        const chatData = {
            id: chatId,
            participants: [currentUser.uid, contactData.userId],
            participantNames: [currentUserName, contactName],
            participantDetails: {
                [currentUser.uid]: {
                    name: currentUserName,
                    email: currentUser.email || '',
                    photoURL: currentUser.photoURL || '',
                    uid: currentUser.uid // Garante que o UID está incluído
                },
                [contactData.userId]: {
                    name: contactName,
                    email: contactData.email || '',
                    photoURL: contactData.photoURL || contactData.photoBase64 || '',
                    uid: contactData.userId // Garante que o UID está incluído
                }
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessage: '',
            lastMessageAt: null,
            lastMessageSenderId: null,
            unreadCounts: {
                [currentUser.uid]: 0,
                [contactData.userId]: 0
            }
        };
        
        console.log('Dados do chat a serem salvos:', chatData);
        
        // Cria o documento do chat na coleção 'chats'
        await setDoc(doc(db, 'chats', chatId), chatData);
        
        // Adiciona o chat à subcoleção 'chats' de cada participante
        try {
            console.log('Iniciando batch write para criar chat...');
            const batch = writeBatch(db);
            
            // Para o usuário atual
            const currentUserChatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
            console.log('Criando referência para o chat do usuário atual:', currentUserChatRef.path);
            
            batch.set(currentUserChatRef, {
                chatId: chatId,
                otherUserId: contactData.userId,
                otherUserName: contactName,
                otherUserPhotoURL: contactData.photoURL || contactData.photoBase64 || '',
                lastMessage: '',
                lastMessageAt: null,
                lastMessageSenderId: null,
                unreadCount: 0,
                updatedAt: serverTimestamp()
            });
            
            // Para o contato (se o contato tiver UID válido)
            if (contactData.userId) {
                const contactChatRef = doc(db, 'users', contactData.userId, 'chats', chatId);
                console.log('Criando referência para o chat do contato:', contactChatRef.path);
                
                batch.set(contactChatRef, {
                    chatId: chatId,
                    otherUserId: currentUser.uid,
                    otherUserName: currentUserName,
                    otherUserPhotoURL: currentUser.photoURL || '',
                    lastMessage: '',
                    lastMessageAt: null,
                    lastMessageSenderId: null,
                    unreadCount: 0,
                    updatedAt: serverTimestamp()
                });
            } else {
                console.warn('ID do contato inválido, pulando criação do chat para o contato');
            }
            
            console.log('Commitando batch...');
            await batch.commit();
            console.log('Batch commitado com sucesso');
        } catch (batchError) {
            console.error('Erro ao executar batch write:', batchError);
            throw batchError; // Re-lança o erro para ser capturado pelo bloco catch externo
        }
        
        console.log('Novo chat criado com sucesso:', chatId);
        return { id: chatId, ...chatData };
        
    } catch (error) {
        console.error('Erro ao criar novo chat:', error);
        showNotification('error', 'Erro', 'Não foi possível iniciar o chat. Tente novamente mais tarde.');
        return null;
    }
}

// Inicia uma nova conversa
async function startNewChat(contact) {
    if (!contact || !contact.id) {
        console.error('Contato inválido:', contact);
        showNotification('error', 'Erro', 'Contato inválido. Por favor, tente novamente.');
        return;
    }
    
    // Verifica se o contato tem UID válido
    if (!contact.userId) {
        console.error('Contato sem UID válido:', contact);
        showNotification('warning', 'Aviso', 'Este contato não está disponível para chat. Por favor, tente ligar para este contato.');
        return;
    }
    
    try {
        // Busca os dados mais recentes do contato para garantir que temos o UID correto
        let contactData = { ...contact };
        try {
            const contactDoc = await getDoc(doc(db, 'people', contact.id));
            if (contactDoc.exists()) {
                const latestData = contactDoc.data();
                contactData = {
                    ...contactData,
                    userId: latestData.uid || contact.userId || contact.id, // Garante que temos o UID correto
                    displayName: latestData.name || contact.displayName,
                    email: latestData.email || contact.email,
                    photoURL: latestData.photoURL || latestData.photoBase64 || contact.photoURL || ''
                };
                
                // Verifica novamente o UID após buscar os dados atualizados
                if (!contactData.userId) {
                    throw new Error('Contato não possui UID válido');
                }
            }
        } catch (error) {
            console.error('Erro ao buscar dados atualizados do contato:', error);
            showNotification('error', 'Erro', 'Não foi possível carregar os dados do contato. Tente novamente.');
            return;
        }
        
        // Verifica se já existe um chat com este contato
        const existingChat = await findExistingChat(contactData.userId);
        
        if (existingChat) {
            // Atualiza as informações do contato antes de abrir o chat
            const updatedChat = {
                ...existingChat,
                withId: contactData.userId, // Garante que estamos usando o UID correto
                withName: contactData.displayName || existingChat.withName,
                photoURL: contactData.photoURL || contactData.photoBase64 || existingChat.photoURL,
                status: contactData.status || 'offline'
            };
            openChat(updatedChat);
            return;
        }
        
        // Cria um novo chat
        const newChat = await createNewChat(contactData);
        
        if (newChat) {
            // Obtém o status atual do contato
            let contactStatus = 'offline';
            try {
                // Usa o UID para verificar o status
                const statusDoc = await getDoc(doc(db, 'chat_status', contactData.userId));
                if (statusDoc.exists()) {
                    contactStatus = statusDoc.data().status || 'offline';
                }
            } catch (error) {
                console.error('Erro ao verificar status do contato:', error);
            }
            
            // Abre o chat recém-criado com todas as informações necessárias
            openChat({
                id: newChat.id,
                withId: contactData.userId, // Usa o UID em vez do ID do documento
                withName: contactData.displayName || contactData.email || 'Contato',
                withPhoto: contactData.photoURL || contactData.photoBase64 || '',
                lastMessage: newChat.lastMessage || '',
                timestamp: newChat.timestamp || new Date().toISOString(),
                unreadCount: 0,
                status: contactStatus,
                // Garante que os participantes estejam corretos
                participants: [currentUser.uid, contactData.userId],
                participantDetails: {
                    [currentUser.uid]: {
                        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Você',
                        email: currentUser.email || '',
                        photoURL: currentUser.photoURL || '',
                        uid: currentUser.uid
                    },
                    [contactData.userId]: {
                        name: contactData.displayName || contactData.email?.split('@')[0] || 'Contato',
                        email: contactData.email || '',
                        photoURL: contactData.photoURL || contactData.photoBase64 || '',
                        uid: contactData.userId
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro ao iniciar nova conversa:', error);
        
        // Mensagens de erro mais específicas
        let errorMessage = 'Não foi possível iniciar a conversa. Tente novamente.';
        
        if (error.message.includes('não possui UID válido') || 
            error.message.includes('não está disponível para chat')) {
            errorMessage = 'Este contato não está disponível para chat. Por favor, tente ligar.';
        } else if (error.message.includes('permission-denied')) {
            errorMessage = 'Você não tem permissão para iniciar uma conversa com este contato.';
        } else if (error.message.includes('not-found')) {
            errorMessage = 'Contato não encontrado. Por favor, verifique e tente novamente.';
        }
        
        showNotification('error', 'Erro', errorMessage);
    }
}

// Envia uma mensagem
async function sendMessage() {
    const message = messageInput.value.trim();
    
    // Validações iniciais
    if (!message) return;
    if (!currentUser || !currentUser.uid) {
        console.error('Usuário não autenticado ou sem UID');
        showNotification('error', 'Erro', 'Você precisa estar autenticado para enviar mensagens.');
        return;
    }
    if (!currentChatId) {
        console.error('Nenhum chat selecionado');
        showNotification('error', 'Erro', 'Nenhum chat selecionado.');
        return;
    }
    
    // Salva a referência do elemento de entrada para limpar depois
    const inputElement = messageInput;
    
    // Desabilita o botão de enviar para evitar múltiplos envios
    const sendButton = document.querySelector('.send-message-btn');
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    try {
        // 1. Primeiro, obtém os dados do chat
        const chatRef = doc(db, 'chats', currentChatId);
        const chatDoc = await getDoc(chatRef);
        
        if (!chatDoc.exists()) {
            throw new Error('Chat não encontrado');
        }
        
        const chatData = chatDoc.data();
        
        // 2. Valida os participantes do chat
        if (!chatData.participants || !Array.isArray(chatData.participants) || chatData.participants.length === 0) {
            throw new Error('Chat sem participantes válidos');
        }
        
        // 3. Verifica se o usuário atual é um participante do chat
        if (!chatData.participants.includes(currentUser.uid)) {
            throw new Error('Você não tem permissão para enviar mensagens neste chat');
        }
        
        // 4. Obtém o ID do destinatário (o outro participante)
        const recipientId = chatData.participants.find(id => id !== currentUser.uid);
        if (!recipientId) {
            throw new Error('Não foi possível identificar o destinatário');
        }
        
        // 5. Verifica se o destinatário tem UID válido
        try {
            // Busca o destinatário na coleção 'people' pelo UID (não pelo ID do doc)
        const recipientQuery = query(collection(db, 'people'), where('uid', '==', recipientId));
        const recipientSnapshot = await getDocs(recipientQuery);

        if (recipientSnapshot.empty) {
            throw new Error('Destinatário não encontrado');
        }

        const recipientData = recipientSnapshot.docs[0].data();
        if (!recipientData.uid) {
            throw new Error('Este contato não está mais disponível para chat. Por favor, tente ligar.');
        }

        } catch (error) {
            console.error('Erro ao verificar destinatário:', error);
            throw new Error('Não foi possível verificar o destinatário. Tente novamente mais tarde.');
        }
        
        // 6. Limpa o campo de mensagem imediatamente para feedback visual
        inputElement.value = '';
        
        // 7. Prepara os dados da mensagem
        const messageData = {
            text: message,
            senderId: currentUser.uid,
            timestamp: serverTimestamp(),
            status: 'sent',
            sentAt: new Date().toISOString(),
            senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário'
        };
        
        // 8. Adiciona a mensagem à subcoleção 'messages'
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        const messageRef = await addDoc(messagesRef, messageData);
        
        // Atualiza o status para 'delivered' quando a mensagem é salva
        await updateDoc(messageRef, {
            status: 'delivered',
            messageId: messageRef.id
        });
        
        // Atualiza o timestamp da última mensagem no chat
        await updateDoc(doc(db, 'chats', currentChatId), {
            lastMessage: message,
            lastMessageAt: serverTimestamp(),
            lastMessageBy: currentUser.uid,
            updatedAt: serverTimestamp(),
            lastMessageStatus: 'delivered'
        });
        
        // 8. Prepara as atualizações para o documento do chat
        const updates = {
            lastMessage: message,
            lastMessageAt: serverTimestamp(),
            lastMessageSenderId: currentUser.uid,
            updatedAt: serverTimestamp(),
            // Garante que o campo unreadCounts existe
            unreadCounts: chatData.unreadCounts || {}
        };
        
        // 9. Atualiza a contagem de mensagens não lidas
        // Zera a contagem para o remetente
        updates.unreadCounts[currentUser.uid] = 0;
        
        // Incrementa para os outros participantes
        const batch = writeBatch(db);
        let hasValidRecipients = false;
        
        if (chatData.participants && Array.isArray(chatData.participants)) {
            for (const participantId of chatData.participants) {
                if (participantId !== currentUser.uid) {
                    updates.unreadCounts[participantId] = (updates.unreadCounts[participantId] || 0) + 1;
                    
                    try {
                        // Verifica se o participante tem UID válido
                        const participantDoc = await getDoc(doc(db, 'people', participantId));
                        if (!participantDoc.exists() || !participantDoc.data()?.uid) {
                            console.warn(`Participante ${participantId} não encontrado ou sem UID, pulando atualização`);
                            continue;
                        }
                        
                        // Atualiza o documento do chat para o participante
                        const userChatRef = doc(db, 'users', participantId, 'chats', currentChatId);
                        batch.set(userChatRef, {
                            lastMessage: message,
                            lastMessageAt: serverTimestamp(),
                            lastMessageSenderId: currentUser.uid,
                            unreadCount: updates.unreadCounts[participantId],
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                        
                        hasValidRecipients = true;
                    } catch (error) {
                        console.error(`Erro ao atualizar chat do usuário ${participantId}:`, error);
                    }
                }
            }
        }
        
        // 10. Aplica as atualizações em lote
        if (hasValidRecipients) {
            await batch.commit();
        }
        
        // 12. Atualiza o documento principal do chat
        await updateDoc(chatRef, updates);
        
        // 13. Mantém o foco no campo de mensagem
        inputElement.focus();
        
        // 14. Força a atualização da lista de chats
        if (typeof loadChats === 'function') {
            loadChats();
        }
        
        console.log('Mensagem enviada e chat atualizado com sucesso');
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        
        // Mensagens de erro mais amigáveis
        let errorMessage = 'Erro ao enviar mensagem';
        
        if (error.message.includes('permission-denied')) {
            errorMessage = 'Você não tem permissão para enviar mensagens neste chat';
        } else if (error.message.includes('not-found') || error.message.includes('não encontrado')) {
            errorMessage = 'Chat não encontrado. Por favor, recarregue a página e tente novamente.';
        } else if (error.message.includes('não está mais disponível para chat')) {
            errorMessage = error.message;
        } else if (error.message.includes('destinatário')) {
            errorMessage = error.message;
        }
        
        showNotification('error', 'Erro', errorMessage);
        
    } finally {
        // Reativa o botão de enviar independentemente do resultado
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }
}

// Carrega as mensagens de uma conversa
let messageListener = null;

// Rastreia as mensagens que já foram marcadas como lidas
const readMessages = new Set();

async function loadMessages(chatId) {
    if (!chatId) return;
    
    // Atualiza o chat atual
    currentChatId = chatId;
    
    // Marca as mensagens como lidas
    await markAsRead(chatId);
    if (!chatId) {
        console.warn('[loadMessages] ID do chat não fornecido');
        return;
    }

    // Remove o listener anterior se existir
    if (messageListener) {
        messageListener();
        messageListener = null;
    }

    try {
        // Verifica se o chat existe antes de tentar carregar as mensagens
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (!chatDoc.exists()) {
            console.warn(`[loadMessages] Chat não encontrado: ${chatId}`);
            conversationMessages.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Chat não encontrado</p>
                    <p class="hint">O chat que você está tentando acessar não existe mais</p>
                </div>
            `;
            return;
        }
        
        // Obtém os detalhes dos participantes do chat
        const chatData = chatDoc.data();
        const participantDetails = chatData.participantDetails || {};
        
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        
        // Limpa as mensagens atuais
        conversationMessages.innerHTML = '';
        
        // Carrega as mensagens iniciais uma vez
        const initialSnapshot = await getDocs(q);
        const initialMessages = [];
        
        // Processa as mensagens iniciais
        initialSnapshot.forEach((doc) => {
            initialMessages.push({ id: doc.id, ...doc.data() });
        });
        
        // Exibe as mensagens iniciais
        await displayMessages(initialMessages, participantDetails, conversationMessages);
        
        // Configura listener em tempo real para novas mensagens
        messageListener = onSnapshot(q, async (snapshot) => {
            const batch = [];
            const now = new Date();
            
            // Processa todas as mudanças
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added' && !document.getElementById(`message-${change.doc.id}`)) {
                    const message = { id: change.doc.id, ...change.doc.data() };
                    
                    // Carrega informações do remetente se necessário
                    if (message.senderId && !participants[message.senderId]) {
                        try {
                            const userRef = doc(db, 'people', message.senderId);
                            const userDoc = await getDoc(userRef);
                            if (userDoc.exists()) {
                                participants[message.senderId] = userDoc.data();
                            }
                        } catch (error) {
                            console.error('Erro ao carregar dados do remetente:', error);
                        }
                    }

                    const messageElement = await createMessageElement(message, participants);
                    messageElement.id = `message-${message.id}`;
                    messagesContainer.appendChild(messageElement);
                    
                    // Marca como lida se for uma mensagem recebida
                    if (message.senderId !== currentUser.uid && message.status !== 'read' && !readMessages.has(message.id)) {
                        readMessages.add(message.id);
                        batch.push(updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
                            status: 'read',
                            readAt: now.toISOString()
                        }));
                        
                        // Atualiza o status da última mensagem no chat
                        if (snapshot.docs[snapshot.docs.length - 1]?.id === message.id) {
                            batch.push(updateDoc(doc(db, 'chats', chatId), {
                                lastMessageStatus: 'read',
                                updatedAt: serverTimestamp()
                            }));
                        }
                    }
                    
                    // Rola para a nova mensagem
                    messageElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
            
            // Executa todas as atualizações em lote
            if (batch.length > 0) {
                try {
                    await Promise.all(batch);
                    // Atualiza a contagem de mensagens não lidas
                    updateUnreadCount(0);
                } catch (error) {
                    console.error('Erro ao atualizar status das mensagens:', error);
                }
            }
        }, (error) => {
            console.error(`[loadMessages] Erro no listener de mensagens:`, error);
        });
        
        // Função auxiliar para exibir mensagens
        async function displayMessages(messages, participants, container) {
            container.innerHTML = '';
            
            if (messages.length === 0) {
                container.innerHTML = `
                    <div class="no-messages">
                        <i class="fas fa-comment-alt"></i>
                        <p>Nenhuma mensagem ainda</p>
                        <p class="hint">Envie uma mensagem para começar a conversa</p>
                    </div>
                `;
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            for (const message of messages) {
                try {
                    const messageElement = await createMessageElement(message, participants);
                    messageElement.id = `message-${message.id}`;
                    fragment.appendChild(messageElement);
                } catch (error) {
                    console.error('Erro ao criar elemento de mensagem:', error);
                }
            }
            
            container.appendChild(fragment);
            container.scrollTop = container.scrollHeight;
        }
        
    } catch (error) {
        console.error(`[loadMessages] Erro ao carregar mensagens do chat ${chatId}:`, error);
        conversationMessages.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar mensagens</p>
                <p class="hint">${error.message}</p>
            </div>
        `;
    }
}

// Cria um elemento de mensagem
async function createMessageElement(message, participantDetails = {}) {
    const isSent = message.senderId === currentUser.uid;
    const time = message.timestamp ? formatTime(message.timestamp.toDate()) : '';
    
    // Mapeamento de status para texto e ícones
    const statusInfo = {
        sent: { text: 'Enviada', icon: '✓' },
        delivered: { text: 'Entregue', icon: '✓✓' },
        read: { text: 'Lida', icon: '✓✓' },
        error: { text: 'Erro ao enviar', icon: '!' }
    };
    
    // Obtém o status da mensagem (padrão: 'sent' para mensagens enviadas)
    const messageStatus = message.status || (isSent ? 'sent' : null);
    const status = statusInfo[messageStatus] || null;
    
    // Busca os dados do remetente
    let senderName = 'Usuário';
    let senderInitials = 'U';
    let avatarColor = '#ccc';
    let photoURL = '';
    
    if (message.senderId) {
        try {
            // Verifica se temos os detalhes do participante no objeto participantDetails
            if (participantDetails[message.senderId]) {
                const participant = participantDetails[message.senderId];
                senderName = participant.name || participant.displayName || 'Usuário';
                photoURL = participant.photoURL || '';
            } 
            // Se não encontrar no participantDetails, tenta buscar no Firestore
            else {
                const senderRef = doc(db, 'people', message.senderId);
                const senderDoc = await getDoc(senderRef);
                
                if (senderDoc.exists()) {
                    const senderData = senderDoc.data();
                    senderName = senderData.name || senderData.displayName || 'Usuário';
                    photoURL = senderData.photoURL || '';
                }
            }
            
            // Gera iniciais a partir do nome
            if (senderName) {
                senderInitials = getInitials(senderName);
                // Gera uma cor baseada no ID do usuário para o avatar
                avatarColor = stringToColor(message.senderId);
            }
        } catch (error) {
            console.error('Erro ao buscar dados do remetente:', error);
        }
    }
    
    const element = document.createElement('div');
    element.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
    
    // Se for uma mensagem recebida, adiciona apenas o nome do remetente
    if (!isSent) {
        element.innerHTML = `
            <div class="message-content">
                <div class="message-sender">${senderName}</div>
                <div class="message-bubble">
                    ${message.text}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    } else {
        // Para mensagens enviadas, adiciona o status
        element.innerHTML = `
            <div class="message-bubble">
                ${message.text}
                <div class="message-time">
                    ${time}
                    ${status ? `
                        <span class="message-status" title="${status.text}">
                            ${status.icon}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    return element;
}

// Função auxiliar para gerar uma cor a partir de uma string
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

// Marca as mensagens como lidas
async function markAsRead(chatId) {
    if (!chatId || !currentUser) return;
    
    try {
        const chatRef = doc(db, 'chats', chatId);
        await updateDoc(chatRef, {
            [`unreadCounts.${currentUser.uid}`]: 0,
            updatedAt: serverTimestamp()
        });
        
        // Atualiza a lista de chats para refletir a mudança
        if (typeof updateChatList === 'function') {
            const chatDoc = await getDoc(chatRef);
            if (chatDoc.exists()) {
                updateChatList({ id: chatId, ...chatDoc.data() });
            }
        }
    } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
    }
    if (!currentUser) {
        console.warn('[markAsRead] Usuário não autenticado');
        return;
    }
    
    if (!chatId) {
        console.warn('[markAsRead] ID do chat não fornecido');
        return;
    }
    
    try {
        // Verifica se o chat existe na coleção principal de chats
        const mainChatRef = doc(db, 'chats', chatId);
        const mainChatDoc = await getDoc(mainChatRef);
        
        if (!mainChatDoc.exists()) {
            console.warn(`[markAsRead] Chat principal não encontrado: ${chatId}`);
            return;
        }
        
        // Referência ao documento do chat do usuário
        const userChatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
        const userChatDoc = await getDoc(userChatRef);
        
        // Verifica se o documento do chat do usuário existe antes de tentar atualizar
        if (userChatDoc.exists()) {
            await updateDoc(userChatRef, {
                unreadCount: 0,
                updatedAt: serverTimestamp()
            });
            console.log(`[markAsRead] Chat marcado como lido: ${chatId}`);
        } else {
            console.warn(`[markAsRead] Documento do chat não encontrado para o usuário: users/${currentUser.uid}/chats/${chatId}`);
            
            // Tenta criar o documento do chat se não existir
            try {
                await setDoc(userChatRef, {
                    chatId: chatId,
                    unreadCount: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                console.log(`[markAsRead] Criado novo documento de chat para o usuário: ${chatId}`);
            } catch (createError) {
                console.error(`[markAsRead] Erro ao criar documento de chat:`, createError);
            }
        }
    } catch (error) {
        console.error('[markAsRead] Erro ao marcar mensagens como lidas:', error);
    }
}

// Atualiza o contador de mensagens não lidas
function updateUnreadCount(count) {
    unreadCount += count;
    
    if (unreadCount > 0) {
        unreadMessagesBadge.textContent = unreadCount;
        unreadMessagesBadge.style.display = 'flex';
        chatButton.classList.add('pulse');
    } else {
        unreadCount = 0;
        unreadMessagesBadge.style.display = 'none';
        chatButton.classList.remove('pulse');
    }
}

// Funções relacionadas a grupos foram removidas para simplificar o chat

// Adiciona estilos para os status das mensagens
const style = document.createElement('style');
style.textContent = `
    .message-status {
        display: inline-block;
        margin-left: 8px;
        font-size: 0.8em;
        color: #888;
        opacity: 0.8;
    }
    
    .message-status[title="Lida"] {
        color: #4CAF50;
    }
    
    .message-status[title="Entregue"] {
        color: #2196F3;
    }
    
    .message-status[title="Enviada"] {
        color: #9E9E9E;
    }
    
    .message-time {
        display: inline-block;
        margin-left: 8px;
        font-size: 0.8em;
        color: #888;
    }
`;
document.head.appendChild(style);

// Funções auxiliares
function toggleChatModal() {
    chatModal.classList.toggle('active');
    
    if (chatModal.classList.contains('active')) {
        // Foca no campo de busca quando o chat é aberto
        chatSearch.focus();
    }
}

function switchTab(tab) {
    // Remove a classe active de todas as abas e conteúdos
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Adiciona a classe active à aba e conteúdo selecionados
    document.querySelector(`.tab-button[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getInitials(name) {
    if (!name) return '??';
    return name
        .split(' ')
        .filter(part => part.length > 0)
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function formatTime(date) {
    if (!(date instanceof Date)) return '';
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Exporta funções para uso em outros arquivos
window.chatModule = {
    openChatWithUser: (userId) => {
        // Implemente a lógica para abrir o chat com um usuário específico
        console.log('Abrindo chat com o usuário:', userId);
    },
    showUnreadCount: (count) => {
        updateUnreadCount(count);
    }
};
