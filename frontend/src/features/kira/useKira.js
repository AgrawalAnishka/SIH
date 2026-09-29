import { useCallback, useEffect, useRef, useState } from "react";
import { kiraApi } from "./kiraApi";

export function useKira(enabled) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const activeRef = useRef(null);
  const sendingRef = useRef(false);

  const refreshList = useCallback(async () => {
    try {
      setConversations(await kiraApi.listConversations());
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    if (enabled) refreshList();
  }, [enabled, refreshList]);

  function newChat() {
    if (sendingRef.current) return;
    activeRef.current = null;
    setActiveId(null);
    setMessages([]);
    setError("");
  }

  async function openConversation(id) {
    if (sendingRef.current) return;
    activeRef.current = id;
    setActiveId(id);
    setError("");
    setLoading(true);
    try {
      const data = await kiraApi.getConversation(id);
      if (activeRef.current === id) setMessages(data.messages);
    } catch {
      if (activeRef.current === id) {
        setMessages([]);
        setError("Could not load this conversation.");
      }
    } finally {
      if (activeRef.current === id) setLoading(false);
    }
  }

  async function send(text) {
    const content = text.trim();
    if (!content || sendingRef.current) return false;
    sendingRef.current = true;
    setSending(true);
    setError("");
    setMessages((m) => [
      ...m,
      { role: "user", content, created_at: new Date().toISOString() },
    ]);
    try {
      const res = await kiraApi.chat({
        message: content,
        conversationId: activeRef.current,
      });
      activeRef.current = res.conversation.id;
      setActiveId(res.conversation.id);
      setMessages((m) => [...m, res.message]);
      refreshList();
      return true;
    } catch (e) {
      setMessages((m) => m.slice(0, -1)); // roll back the optimistic message
      setError(
        e.status === 429
          ? "You're sending messages too fast. Please wait a moment."
          : "The chatbot couldn't respond. Please try again."
      );
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function rename(id, title) {
    try {
      await kiraApi.renameConversation(id, title);
      setConversations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch {
      setError("Could not rename the conversation.");
    }
  }

  async function remove(id) {
    try {
      await kiraApi.deleteConversation(id);
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (activeRef.current === id) newChat();
    } catch {
      setError("Could not delete the conversation.");
    }
  }

  async function loadMemories() {
    try {
      setMemories(await kiraApi.listMemories());
    } catch {
      setError("Could not load saved memory.");
    }
  }

  async function removeMemory(key) {
    try {
      await kiraApi.deleteMemory(key);
      setMemories((ms) => ms.filter((m) => m.key !== key));
    } catch {
      setError("Could not delete that item.");
    }
  }

  async function clearMemories() {
    try {
      await kiraApi.clearMemories();
      setMemories([]);
    } catch {
      setError("Could not clear memory.");
    }
  }

  return {
    conversations,
    activeId,
    messages,
    memories,
    loading,
    sending,
    error,
    newChat,
    openConversation,
    send,
    rename,
    remove,
    loadMemories,
    removeMemory,
    clearMemories,
  };
}
