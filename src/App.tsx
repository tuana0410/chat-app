import { useState, useEffect } from 'react';
import { AuthModal } from './components/AuthModal';
import { supabase } from './services/supabase';
import { MessageSquare, Send, UserPlus, Search, User } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  userTag: string;
}

interface ChatRoom {
  id: number;
  room_name: string;
  partner_name?: string;
  partner_tag?: string;
  is_group: boolean;
}

interface MessageItem {
  id?: number;
  room_id: number;
  sender_id: string;
  sender_username: string;
  content: string;
  created_at: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTag, setSearchTag] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Kullanıcının Dahil Olduğu Odaları Çek
  const fetchRooms = async () => {
    if (!currentUser) return;

    const { data: participants, error: pErr } = await supabase
      .from('room_participants')
      .select('room_id')
      .eq('user_id', currentUser.id);

    if (pErr || !participants || participants.length === 0) {
      setRooms([]);
      return;
    }

    const roomIds = participants.map((p) => p.room_id);

    const { data: roomList } = await supabase
      .from('rooms')
      .select('*')
      .in('id', roomIds);

    if (!roomList) return;

    const formattedRooms: ChatRoom[] = await Promise.all(
      roomList.map(async (r) => {
        const { data: otherMember } = await supabase
          .from('room_participants')
          .select('user_id')
          .eq('room_id', r.id)
          .neq('user_id', currentUser.id)
          .maybeSingle();

        let partnerName = r.room_name;
        let partnerTag = '';

        if (otherMember) {
          const { data: partnerProfile } = await supabase
            .from('profiles')
            .select('username, user_tag')
            .eq('id', otherMember.user_id)
            .maybeSingle();

          if (partnerProfile) {
            partnerName = partnerProfile.username;
            partnerTag = partnerProfile.user_tag;
          }
        }

        return {
          id: r.id,
          room_name: partnerName,
          partner_name: partnerName,
          partner_tag: partnerTag,
          is_group: r.is_group,
        };
      })
    );

    setRooms(formattedRooms);
    if (!activeRoom && formattedRooms.length > 0) {
      setActiveRoom(formattedRooms[0]);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchRooms();
    }
  }, [currentUser]);

  // Aktif Odanın Mesajlarını Çek ve Canlı Dinle
  useEffect(() => {
    if (!activeRoom) return;

    const fetchRoomMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    };

    fetchRoomMessages();

    const channel = supabase
      .channel(`room_${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${activeRoom.id}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageItem;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  // Kişi Ekle (Kimlik Kodu / Tag ile Sohbet Başlat)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTag.trim() || !currentUser) return;
    setAddError('');
    setAddLoading(true);

    try {
      if (searchTag.trim().toLowerCase() === currentUser.userTag.toLowerCase()) {
        throw new Error('Kendinizi ekleyemezsiniz.');
      }

      const { data: targetUser, error: searchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_tag', searchTag.trim())
        .maybeSingle();

      if (searchErr || !targetUser) {
        throw new Error('Bu kimliğe sahip kullanıcı bulunamadı.');
      }

      // Yeni birebir oda oluştur
      const { data: newRoom, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          room_name: `${currentUser.username} - ${targetUser.username}`,
          is_group: false,
        })
        .select()
        .single();

      if (roomErr || !newRoom) throw roomErr;

      // İki kullanıcıyı da odaya ekle
      await supabase.from('room_participants').insert([
        { room_id: newRoom.id, user_id: currentUser.id },
        { room_id: newRoom.id, user_id: targetUser.id },
      ]);

      setShowAddModal(false);
      setSearchTag('');
      await fetchRooms();

      setActiveRoom({
        id: newRoom.id,
        room_name: targetUser.username,
        partner_name: targetUser.username,
        partner_tag: targetUser.user_tag,
        is_group: false,
      });
    } catch (err: any) {
      setAddError(err.message || 'Kullanıcı eklenemedi.');
    } finally {
      setAddLoading(false);
    }
  };

  // Mesaj Gönder
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !activeRoom) return;

    const content = inputText;
    setInputText('');

    const { error } = await supabase.from('messages').insert({
      room_id: activeRoom.id,
      sender_id: currentUser.id,
      sender_username: currentUser.username,
      content: content,
    });

    if (error) {
      console.error('Mesaj iletme hatası:', error.message);
    }
  };

  if (!currentUser) {
    return <AuthModal onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 antialiased font-sans">
      {/* Sol Panel */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Kullanıcı Başlığı ve + Butonu */}
        <div className="p-4 bg-emerald-700 text-white flex justify-between items-center shadow-sm">
          <div>
            <h1 className="font-bold text-base leading-tight">{currentUser.username}</h1>
            <p className="text-xs text-emerald-200">Kimlik: {currentUser.userTag}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full transition text-white shadow"
            title="Kişi Ekle"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {/* Sohbet Listesi */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {rooms.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              Henüz sohbetiniz yok. Üstteki <b>+</b> butonuna basarak bir arkadaşınızın <b>Kimlik Kodunu</b> ekleyin.
            </div>
          ) : (
            rooms.map((room) => {
              const isSelected = activeRoom?.id === room.id;
              return (
                <div
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`p-3.5 cursor-pointer flex items-center gap-3 transition ${
                    isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">
                      {room.partner_name || room.room_name}
                    </h4>
                    {room.partner_tag && (
                      <p className="text-[11px] text-gray-400 truncate">Kimlik: {room.partner_tag}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sağ Panel (Mesajlaşma) */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        {activeRoom ? (
          <>
            <div className="p-3.5 bg-white border-b flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div>
                <h2 className="font-bold text-sm text-gray-800">{activeRoom.partner_name || activeRoom.room_name}</h2>
                {activeRoom.partner_tag && (
                  <p className="text-[10px] text-gray-400">Kimlik: {activeRoom.partner_tag}</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {messages.map((m, idx) => {
                const isMe = m.sender_username === currentUser.username;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-md rounded-xl px-3.5 py-2 shadow-sm text-sm ${
                        isMe ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'
                      }`}
                    >
                      {!isMe && (
                        <p className="text-[10px] font-bold text-emerald-800 mb-0.5">{m.sender_username}</p>
                      )}
                      <p className="leading-relaxed">{m.content}</p>
                      <span className="text-[9px] text-gray-400 block text-right mt-1">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex items-center gap-2">
              <input
                type="text"
                placeholder="Bir mesaj yazın..."
                className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:border-emerald-500 bg-gray-50"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                type="submit"
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={48} className="stroke-1 mb-2" />
            <p className="text-sm">Sohbete başlamak için bir kişi seçin veya + ile ekleyin.</p>
          </div>
        )}
      </div>

      {/* Kişi Ekleme Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-base text-gray-800">Kişi Ekle (Sohbet Başlat)</h3>
            
            {addError && (
              <div className="bg-red-50 text-red-600 text-xs p-2 rounded border border-red-100">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kullanıcı Kimlik Kodu (ID)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Örn: tuana_7558"
                    className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500"
                    value={searchTag}
                    onChange={(e) => setSearchTag(e.target.value)}
                  />
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(''); }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {addLoading ? 'Ekleniyor...' : 'Sohbet Başlat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}