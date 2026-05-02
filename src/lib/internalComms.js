export function isAdminUser(user = {}) {
  const role = String(user.perms || user.role || '').toLowerCase();
  return role === 'admin' || role === 'crm';
}

export function getCurrentMember(data = {}, user = {}) {
  const email = String(user.email || '').toLowerCase();
  const byEmail = (data.team || []).find(m => String(m.email || '').toLowerCase() === email);
  const byId = (data.team || []).find(m => String(m.id) === String(user.id));
  return byEmail || byId || {
    id: user.id || email || 'local-user',
    name: user.name || user.email || 'Equipo',
    email: user.email || '',
    initials: user.initials || String(user.name || user.email || 'EQ').slice(0, 2).toUpperCase(),
    color: user.color || 'var(--blue)',
    perms: user.perms || user.role || 'miembro',
  };
}

export function memberPresence(member = {}, messages = []) {
  const now = Date.now();
  const lastMessage = [...messages]
    .filter(m => String(m.sender_id || '') === String(member.id || ''))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
  const minutes = lastMessage?.created_at
    ? Math.round((now - new Date(lastMessage.created_at).getTime()) / 60000)
    : Number(member.presence_minutes || 180);
  const online = minutes <= 12;
  return {
    online,
    label: online ? 'En linea' : minutes < 60 ? `Hace ${minutes} min` : 'Sin actividad reciente',
  };
}

function normalizeReadBy(value) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (_) {}
  }
  return [];
}

function messageBelongsToConversation(message, conversation) {
  if (conversation.type === 'general') {
    return message.source === 'general' || message.conversation_type === 'general';
  }
  if (conversation.type === 'direct') {
    return String(message.conversation_id || '') === String(conversation.id);
  }
  return String(message.proyecto_id || '') === String(conversation.projectId || '') &&
    !['team', 'general', 'direct', 'portal_cliente'].includes(String(message.source || 'project'));
}

function unreadCount(messages, userId) {
  return messages.filter(m => {
    if (String(m.sender_id || '') === String(userId || '')) return false;
    const readBy = normalizeReadBy(m.read_by);
    return !readBy.includes(String(userId || ''));
  }).length;
}

function lastActivity(messages) {
  return messages.length
    ? Math.max(...messages.map(m => new Date(m.created_at || 0).getTime()))
    : 0;
}

export function directConversationId(a, b) {
  return ['direct', ...[String(a || ''), String(b || '')].sort()].join(':');
}

export function buildInternalConversations(data = {}, user = {}) {
  const current = getCurrentMember(data, user);
  const admin = isAdminUser(user) || isAdminUser(current);
  const messages = data.projectChatMessages || [];
  const team = data.team || [];
  const currentId = current.id || user.id;

  const assignedProjectIds = new Set((data.proyectos || [])
    .filter(p => admin || String(p.creativo || p.creativo_id || p.designer_id || '') === String(currentId))
    .map(p => String(p.id)));

  const generalMessages = messages.filter(m => m.source === 'general' || m.conversation_type === 'general');
  const general = {
    id: 'general',
    type: 'general',
    title: 'Canal general del estudio',
    subtitle: 'Anuncios del estudio',
    messages: generalMessages,
    unread: unreadCount(generalMessages, currentId),
    lastAt: lastActivity(generalMessages) || Date.now() + 1,
    color: 'var(--gold)',
    fixed: true,
  };

  const projectConversations = (data.proyectos || [])
    .filter(p => admin || assignedProjectIds.has(String(p.id)))
    .map(p => {
      const client = (data.clientes || []).find(c => String(c.id) === String(p.clienteId || p.cliente_id || ''));
      const projectMessages = messages.filter(m => messageBelongsToConversation(m, { type:'project', projectId:p.id }));
      return {
        id: `project:${p.id}`,
        type: 'project',
        projectId: p.id,
        title: client?.nombre || p.nombre || 'Proyecto',
        subtitle: p.paquete || p.package_name || 'Chat de proyecto',
        messages: projectMessages,
        unread: unreadCount(projectMessages, currentId),
        lastAt: lastActivity(projectMessages),
        color: 'var(--blue)',
      };
    });

  const directIds = new Set(messages
    .filter(m => m.source === 'direct' || m.conversation_type === 'direct')
    .map(m => m.conversation_id)
    .filter(Boolean));

  team.forEach(member => {
    if (String(member.id) !== String(currentId)) directIds.add(directConversationId(currentId, member.id));
  });

  const directConversations = [...directIds].map(id => {
    const parts = String(id).split(':').slice(1);
    const otherId = parts.find(x => String(x) !== String(currentId)) || parts[0];
    const member = team.find(m => String(m.id) === String(otherId)) || {};
    const directMessages = messages.filter(m => String(m.conversation_id || '') === String(id));
    const presence = memberPresence(member, messages);
    return {
      id,
      type: 'direct',
      targetMemberId: otherId,
      title: member.name || 'Chat personal',
      subtitle: presence.label,
      messages: directMessages,
      unread: unreadCount(directMessages, currentId),
      lastAt: lastActivity(directMessages),
      color: member.color || 'var(--teal)',
      presence,
    };
  });

  return [general, ...projectConversations, ...directConversations]
    .sort((a, b) => Number(b.fixed || 0) - Number(a.fixed || 0) || b.lastAt - a.lastAt);
}

export function searchInternalConversations(conversations = [], query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return conversations;
  return conversations.filter(c => {
    if (`${c.title} ${c.subtitle}`.toLowerCase().includes(q)) return true;
    return (c.messages || []).some(m => `${m.sender_name || ''} ${m.message || ''} ${m.attachment_name || ''}`.toLowerCase().includes(q));
  });
}

