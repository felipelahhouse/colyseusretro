// 👑 ADMIN PANEL - Painel de administração com controles do website
import React, { useState, useEffect } from 'react';
import { Shield, Users, Trash2, Ban, XCircle, Star, AlertTriangle, Gamepad2, RefreshCw, Image as ImageIcon, UserPlus, Wrench } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useGames } from '../../hooks/useGames';
import CoverManager from './CoverManager';
import AllCoversManager from './AllCoversManager';
import BatchCoverUploader from './BatchCoverUploader';
import UserRegistrations from './UserRegistrations';
import SimpleMaintenanceMode from './SimpleMaintenanceMode';

interface UserData {
  id: string;
  username: string;
  email: string;
  is_online: boolean;
  badge?: string;
  created_at?: { seconds: number; nanoseconds: number } | string | Date;
}

interface GameSession {
  id: string;
  sessionName: string;
  gameId: string;
  hostUserId: string;
  host_user_id?: string;
  hostUsername?: string;
  isPublic: boolean;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  createdAt: { seconds: number; nanoseconds: number } | string | Date;
  players?: string[];
}

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'registrations' | 'maintenance' | 'sessions' | 'content' | 'games' | 'covers' | 'allcovers'>('users');
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error' | null;
    count: number;
  }>({ type: null, count: 0 });
  
  // Estados para gerenciamento de sessões
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  
  // Hook para sincronizar jogos
  const { 
    games, 
    syncing, 
    syncGames, 
    uploadGameCover, 
    uploading, 
    platforms,
    availableCovers,
    assignCover,
    getCoverSuggestions,
    deleteCoverFromStorage,
    reloadCovers
  } = useGames();

  // Helper para converter timestamps do Firestore
  const formatFirestoreDate = (timestamp: { seconds: number; nanoseconds: number } | string | Date): string => {
    try {
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleString('pt-BR');
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleString('pt-BR');
      }
      if (typeof timestamp === 'object' && 'seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000).toLocaleString('pt-BR');
      }
      return 'Data inválida';
    } catch {
      return 'Data inválida';
    }
  };

  // Wrapper para upload com plataforma
  const handleBatchUpload = async (file: File, platform: string) => {
    console.log(`📦 Upload: ${file.name} → ${platform}`);
    await uploadGameCover(file);
  };

  useEffect(() => {
    loadUsers();
    if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('created_at', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('[ADMIN] Erro ao carregar usuários:', error);
      setLoading(false);
    }
  };

  const handleSetBadge = async (userId: string, badge: string) => {
    try {
      console.log(`[ADMIN] Atribuindo badge "${badge}" para usuário ${userId}`);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { badge });
      console.log(`[ADMIN] ✅ Badge atribuída com sucesso!`);
      await loadUsers();
      alert(`✅ Badge "${badge}" atribuída com sucesso!`);
    } catch (error) {
      const err = error as { message?: string };
      console.error('[ADMIN] ❌ Erro ao atribuir badge:', error);
      alert(`❌ Erro ao atribuir badge: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  const handleRemoveBadge = async (userId: string) => {
    try {
      console.log(`[ADMIN] Removendo badge do usuário ${userId}`);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { badge: null });
      console.log(`[ADMIN] ✅ Badge removida com sucesso!`);
      await loadUsers();
      alert('✅ Badge removida com sucesso!');
    } catch (error) {
      const err = error as { message?: string };
      console.error('[ADMIN] ❌ Erro ao remover badge:', error);
      alert(`❌ Erro ao remover badge: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!confirm('⚠️ Tem certeza que deseja banir este usuário?\n\nEle não poderá mais acessar o website.')) return;
    
    try {
      console.log(`[ADMIN] Banindo usuário ${userId}`);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        banned: true,
        is_online: false,
        banned_at: new Date().toISOString()
      });
      console.log(`[ADMIN] ✅ Usuário banido com sucesso!`);
      await loadUsers();
      alert('✅ Usuário banido com sucesso!');
    } catch (error) {
      const err = error as { message?: string };
      console.error('[ADMIN] ❌ Erro ao banir usuário:', error);
      alert(`❌ Erro ao banir usuário: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('🚨 ATENÇÃO: Isto irá deletar PERMANENTEMENTE o usuário!\n\nEsta ação NÃO PODE ser desfeita.\n\nTem certeza?')) return;
    if (!confirm('🚨 CONFIRMAÇÃO FINAL: Deletar usuário permanentemente?')) return;
    
    try {
      console.log(`[ADMIN] Deletando usuário ${userId}`);
      await deleteDoc(doc(db, 'users', userId));
      console.log(`[ADMIN] ✅ Usuário deletado com sucesso!`);
      await loadUsers();
      alert('✅ Usuário deletado com sucesso!');
    } catch (error) {
      const err = error as { message?: string };
      console.error('[ADMIN] ❌ Erro ao deletar usuário:', error);
      alert(`❌ Erro ao deletar usuário: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  // Funções de gerenciamento de sessões
  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      console.log('[ADMIN] Carregando sessões de multiplayer...');
      
      const sessionsQuery = query(
        collection(db, 'game_sessions'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(sessionsQuery);
      console.log('[ADMIN] Sessões encontradas:', snapshot.size);
      
      const sessionsData = await Promise.all(
        snapshot.docs.map(async (sessionDoc) => {
          const data = sessionDoc.data();
          const hostId = data.hostUserId || data.host_user_id;
          
          // Buscar nome do host
          let hostUsername = 'Desconhecido';
          if (hostId) {
            try {
              const userDoc = await getDocs(
                query(collection(db, 'users'), limit(1))
              );
              const user = userDoc.docs.find(u => u.id === hostId);
              if (user) {
                hostUsername = user.data().username || user.data().email || 'Usuário';
              }
            } catch (err) {
              console.log('[ADMIN] Erro ao buscar username do host:', err);
            }
          }
          
          return {
            id: sessionDoc.id,
            ...data,
            hostUsername
          } as GameSession;
        })
      );
      
      setSessions(sessionsData);
      console.log('[ADMIN] ✅ Sessões carregadas:', sessionsData.length);
    } catch (error) {
      const err = error as { message?: string };
      console.error('[ADMIN] ❌ Erro ao carregar sessões:', error);
      alert(`❌ Erro ao carregar sessões: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (!confirm(`🗑️ Tem certeza que deseja deletar a sessão "${sessionName}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      setDeletingSession(sessionId);
      console.log(`[ADMIN] Deletando sessão ${sessionId}...`);
      
      await deleteDoc(doc(db, 'game_sessions', sessionId));
      
      console.log(`[ADMIN] ✅ Sessão deletada com sucesso!`);
      alert(`✅ Sessão "${sessionName}" deletada com sucesso!`);
      
      // Recarregar lista de sessões
      await loadSessions();
    } catch (error) {
      const err = error as { message?: string };
      console.error('[ADMIN] ❌ Erro ao deletar sessão:', error);
      alert(`❌ Erro ao deletar sessão: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setDeletingSession(null);
    }
  };

  const handleDeleteAllSessions = async () => {
    if (!confirm(`🚨 ATENÇÃO: Isto irá deletar TODAS as ${sessions.length} sessões de multiplayer!\n\nTem certeza absoluta?`)) {
      return;
    }
    
    if (!confirm('🚨 CONFIRMAÇÃO FINAL: Deletar TODAS as sessões?')) {
      return;
    }
    
    try {
      setLoadingSessions(true);
      console.log(`[ADMIN] Deletando todas as ${sessions.length} sessões...`);
      
      const deletePromises = sessions.map(session => 
        deleteDoc(doc(db, 'game_sessions', session.id))
      );
      
      await Promise.all(deletePromises);
      
      console.log(`[ADMIN] ✅ Todas as sessões deletadas com sucesso!`);
      alert(`✅ ${sessions.length} sessões deletadas com sucesso!`);
      
      // Recarregar lista
      await loadSessions();
    } catch (error) {
      const err = error as { message?: string };
      console.error('[ADMIN] ❌ Erro ao deletar todas as sessões:', error);
      alert(`❌ Erro ao deletar sessões: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingSessions(false);
    }
  };

  const getBadgeColor = (badge?: string) => {
    const colors: Record<string, string> = {
      admin: 'from-red-500 to-orange-500',
      moderator: 'from-blue-500 to-cyan-500',
      streamer: 'from-purple-500 to-pink-500',
      vip: 'from-yellow-500 to-orange-500',
      beta_tester: 'from-green-500 to-emerald-500',
      pro: 'from-cyan-500 to-blue-500'
    };
    return colors[badge || ''] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      {/* Feedback Visual de Upload */}
      {uploadFeedback.type && (
        <div
          className={`fixed top-4 right-4 z-[60] px-6 py-4 rounded-xl shadow-2xl animate-slide-in flex items-center gap-3 ${
            uploadFeedback.type === 'success'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : 'bg-gradient-to-r from-red-500 to-rose-500'
          }`}
        >
          <div className="text-3xl">
            {uploadFeedback.type === 'success' ? '✅' : '❌'}
          </div>
          <div className="text-white font-bold">
            {uploadFeedback.type === 'success' 
              ? `${uploadFeedback.count} cover${uploadFeedback.count > 1 ? 's' : ''} enviado${uploadFeedback.count > 1 ? 's' : ''}!`
              : `Erro em ${uploadFeedback.count} cover${uploadFeedback.count > 1 ? 's' : ''}`
            }
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20 max-w-6xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-red-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Admin Panel</h2>
                <p className="text-sm text-gray-400">Controle total do website</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 flex-wrap">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Usuários ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('registrations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'registrations'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Registros
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'maintenance'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Manutenção
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'games'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Jogos ({games.length})
            </button>
            <button
              onClick={() => setActiveTab('covers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'covers'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Star className="w-4 h-4" />
              Covers ({availableCovers.length})
            </button>
            <button
              onClick={() => setActiveTab('allcovers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'allcovers'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Todos os Covers
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'sessions'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Sessões Ativas
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'content'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Star className="w-4 h-4" />
              Conteúdo
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
          {activeTab === 'users' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Gerenciar Usuários</h3>
                <button
                  onClick={loadUsers}
                  className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                >
                  Atualizar
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400">Carregando usuários...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {user.username?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{user.username}</span>
                            {user.is_online && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-full text-xs text-green-400">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                Online
                              </span>
                            )}
                            {user.badge && (
                              <span className={`px-2 py-0.5 bg-gradient-to-r ${getBadgeColor(user.badge)} rounded-full text-xs text-white font-bold`}>
                                {user.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Badge Dropdown */}
                        <select
                          className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSetBadge(user.id, e.target.value);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Atribuir Badge</option>
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                          <option value="streamer">Streamer</option>
                          <option value="vip">VIP</option>
                          <option value="beta_tester">Beta Tester</option>
                          <option value="pro">PRO</option>
                        </select>

                        {user.badge && (
                          <button
                            onClick={() => handleRemoveBadge(user.id)}
                            className="p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors"
                            title="Remover Badge"
                          >
                            <XCircle className="w-4 h-4 text-yellow-400" />
                          </button>
                        )}

                        <button
                          onClick={() => handleBanUser(user.id)}
                          className="p-2 bg-orange-500/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors"
                          title="Banir Usuário"
                        >
                          <Ban className="w-4 h-4 text-orange-400" />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                          title="Deletar Usuário"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'games' && (
            <div>
              <div className="mb-6 text-center">
                <Gamepad2 className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Gerenciar Jogos</h3>
                <p className="text-gray-400 mb-6">
                  Sincronize jogos do Firebase Storage e faça upload de covers
                </p>
              </div>

              {/* Card de Upload em Lote */}
              <div className="max-w-2xl mx-auto mb-6">
                <BatchCoverUploader
                  onUpload={handleBatchUpload}
                  uploading={uploading}
                />
              </div>

              {/* Card de Sincronização POR PLATAFORMA */}
              <div className="max-w-2xl mx-auto mb-6">
                <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-2 border-cyan-500/30 rounded-2xl">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-black text-white mb-2">
                      🎮 Sincronização por Plataforma
                    </h4>
                    <p className="text-gray-300 text-sm">
                      Escolha uma plataforma específica ou sincronize todas
                    </p>
                  </div>

                  {/* Lista de Plataformas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {platforms.map((platform) => (
                      <button
                        key={platform.name}
                        onClick={() => syncGames(platform.name)}
                        disabled={syncing}
                        className="p-4 bg-gray-800 border-2 border-cyan-500/30 rounded-xl hover:border-cyan-500 hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-white font-bold text-sm uppercase mb-1">
                          {platform.name}
                        </div>
                        <div className="text-cyan-400 text-xs">
                          {platform.count} jogos
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Botão Sincronizar TUDO */}
                  <button
                    onClick={() => syncGames()}
                    disabled={syncing}
                    className="w-full px-8 py-5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-black text-xl hover:shadow-2xl hover:shadow-cyan-500/50 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-4"
                  >
                    <RefreshCw className={syncing ? 'animate-spin' : ''} size={28} />
                    {syncing ? 'SINCRONIZANDO...' : '🔄 SINCRONIZAR TODAS'}
                  </button>

                  {syncing && (
                    <p className="text-cyan-400 text-sm mt-4 text-center animate-pulse font-bold">
                      ⏳ Sincronização em lote (5 jogos por vez)... 3x mais rápido!
                    </p>
                  )}

                  {/* Info */}
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-300">
                        <p className="font-bold text-white mb-1">Informações:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Jogos no Firestore: <span className="text-cyan-400 font-bold">{games.length}</span></li>
                          <li>✅ Sincronização paralela (5x mais rápida)</li>
                          <li>✅ Busca covers automaticamente</li>
                          <li>✅ Só adiciona jogos novos (sem duplicação)</li>
                          <li>⚡ Processo otimizado: ~5-10 segundos</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'covers' && (
            <CoverManager
              games={games}
              availableCovers={availableCovers}
              onAssignCover={assignCover}
              onGetSuggestions={getCoverSuggestions}
            />
          )}

          {activeTab === 'allcovers' && (
            <AllCoversManager
              availableCovers={availableCovers}
              onDeleteCover={deleteCoverFromStorage}
              onReloadCovers={reloadCovers}
            />
          )}

          {activeTab === 'registrations' && (
            <UserRegistrations />
          )}

          {activeTab === 'maintenance' && (
            <SimpleMaintenanceMode />
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {/* Header com botões de ação */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6 text-cyan-400" />
                    Sessões de Multiplayer
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Gerencie salas de jogos criadas. Total: {sessions.length}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadSessions}
                    disabled={loadingSessions}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                  {sessions.length > 0 && (
                    <button
                      onClick={handleDeleteAllSessions}
                      disabled={loadingSessions}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Deletar Todas
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de sessões */}
              {loadingSessions ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-400">Carregando sessões...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                  <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-400 mb-2">Nenhuma sessão ativa</h3>
                  <p className="text-gray-500">Não há salas de multiplayer criadas no momento.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Informações da sessão */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-bold text-white">
                              {session.sessionName}
                            </h4>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              session.isPublic 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-orange-500/20 text-orange-400'
                            }`}>
                              {session.isPublic ? '🌍 Pública' : '🔒 Privada'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              session.status === 'waiting'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : session.status === 'playing'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {session.status === 'waiting' ? '⏳ Aguardando' :
                               session.status === 'playing' ? '🎮 Jogando' :
                               '⏸️ ' + session.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Host:</span>
                              <span className="text-white ml-2 font-medium">
                                {session.hostUsername}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Jogadores:</span>
                              <span className="text-cyan-400 ml-2 font-bold">
                                {session.currentPlayers}/{session.maxPlayers}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">ID do Jogo:</span>
                              <span className="text-white ml-2 font-mono text-xs">
                                {session.gameId}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">ID da Sessão:</span>
                              <span className="text-gray-500 ml-2 font-mono text-xs">
                                {session.id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>

                          {session.createdAt && (
                            <div className="text-xs text-gray-500">
                              Criada em: {formatFirestoreDate(session.createdAt)}
                            </div>
                          )}
                        </div>

                        {/* Botão deletar */}
                        <button
                          onClick={() => handleDeleteSession(session.id, session.sessionName)}
                          disabled={deletingSession === session.id}
                          className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Deletar sessão"
                        >
                          {deletingSession === session.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-400 border-t-transparent"></div>
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Gerenciar Conteúdo</h3>
              <p className="text-gray-400">Funcionalidade em desenvolvimento...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
