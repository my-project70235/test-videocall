import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_GROUP_MESSAGES, SEND_GROUP_MESSAGE, SEND_GROUP_MESSAGE_WITH_FILE, GET_ME, DELETE_GROUP_MESSAGE, MARK_GROUP_MESSAGE_AS_READ } from '../../graphql/mutations';
import socket from '../socket_io/Socket';
import { X, Paperclip, Image, FileText, Reply, MoreVertical, Trash2, Video } from "lucide-react";
import { BsEmojiSmile } from "react-icons/bs";
import EmojiPicker from 'emoji-picker-react';
import GifSelector from './GifPicker';

const GroupChat = ({ group, onBack }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Media and attachment states
  const [showAttachmentBar, setShowAttachmentBar] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  
  // Reply functionality states
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  
  // Dropdown menu states
  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownRef = useRef(null);
  
  // Refs for file inputs
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const attachmentBarRef = useRef(null);

  const { data: currentUserData } = useQuery(GET_ME);
  const { data: messagesData, loading } = useQuery(GET_GROUP_MESSAGES, {
    variables: { groupId: group.id, limit: 50, offset: 0 },
    skip: !group.id
  });

  const [sendGroupMessage] = useMutation(SEND_GROUP_MESSAGE);
  const [sendGroupMessageWithFile] = useMutation(SEND_GROUP_MESSAGE_WITH_FILE);
  const [deleteGroupMessage] = useMutation(DELETE_GROUP_MESSAGE);
  const [markGroupMessageAsRead] = useMutation(MARK_GROUP_MESSAGE_AS_READ);

  useEffect(() => {
    if (messagesData?.getGroupMessages) {
      setMessages(messagesData.getGroupMessages);
    }
  }, [messagesData]);

  useEffect(() => {
    if (group.id) {
      // Join group room
      socket.joinGroup(group.id);

      // Listen for new messages
      socket.on('newGroupMessage', (newMessage) => {
        if (newMessage.group._id === group.id) {
          setMessages(prev => [...prev, newMessage]);
        }
      });

      // Listen for typing indicators
      socket.on('groupUserTyping', ({ userId, userName, profileImage, isTyping: userIsTyping }) => {
        if (userId !== currentUserData?.getMe?.id) {
          setTypingUsers(prev => {
            if (userIsTyping) {
              return [...prev.filter(u => u.userId !== userId), { userId, userName, profileImage }];
            } else {
              return prev.filter(u => u.userId !== userId);
            }
          });
        }
      });

      // Listen for message deletions
      socket.on('groupMessageDeleted', ({ messageId, groupId }) => {
        if (groupId === group.id) {
          console.log('🗑️ Message deleted remotely:', messageId);
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
        }
      });

      return () => {
        socket.leaveGroup(group.id);
        socket.off('newGroupMessage');
        socket.off('groupUserTyping');
        socket.off('groupMessageDeleted');
      };
    }
  }, [group.id, currentUserData?.getMe?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when they are loaded
  useEffect(() => {
    if (messages.length > 0 && currentUserData?.getMe?.id) {
      const unreadMessages = messages.filter(msg => 
        msg.sender.id !== currentUserData.getMe.id && 
        !msg.readBy?.some(read => read.user.id === currentUserData.getMe.id)
      );

      // Mark unread messages as read
      unreadMessages.forEach(async (msg) => {
        try {
          await markGroupMessageAsRead({
            variables: { messageId: msg._id }
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });
    }
  }, [messages, currentUserData?.getMe?.id, markGroupMessageAsRead]);

  // Close attachment bar on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentBarRef.current && !attachmentBarRef.current.contains(event.target)) {
        setShowAttachmentBar(false);
      }
    };

    if (showAttachmentBar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentBar]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(null);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // If there's a selected file, send media message
    if (selectedFile) {
      await sendMediaMessage(selectedFile, message.trim());
      return;
    }
    
    // If no message text, don't send
    if (!message.trim()) return;

    try {
      console.log('🚀 Sending message with reply:', {
        groupId: group.id,
        content: message.trim(),
        replyTo: replyToMsg?._id || replyToMsg?.id || null
      });
      
      await sendGroupMessage({
        variables: {
          groupId: group.id,
          content: message.trim(),
          messageType: 'text',
          replyTo: replyToMsg?._id || replyToMsg?.id || null
        }
      });
      setMessage('');
      setReplyToMsg(null);
    } catch (error) {
      console.error('Error sending group message:', error);
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket.sendGroupTyping(group.id, true, currentUserData?.getMe?.name);
      
      setTimeout(() => {
        setIsTyping(false);
        socket.sendGroupTyping(group.id, false, currentUserData?.getMe?.name);
      }, 2000);
    }
  };

  const handleEmojiSelect = (event, emojiObject) => {
    setMessage((prev) => prev + (emojiObject?.emoji || event?.emoji));
  };

  // Validate video duration
  const validateVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        resolve(duration <= 60); // 60 seconds limit
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(false);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      event.target.value = '';
      return;
    }

    // If it's a video, validate duration
    if (file.type.startsWith('video/')) {
      const isValidDuration = await validateVideoDuration(file);
      if (!isValidDuration) {
        alert("Video duration should be less than 60 seconds");
        event.target.value = '';
        return;
      }
    }

    setSelectedFile(file);
    setShowAttachmentBar(false);
    console.log("📁 File selected for group chat:", file.name);
    event.target.value = '';
  };

  // Handle video selection
  const handleVideoSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate video duration (only check duration, no file size limit)
    const isValidDuration = await validateVideoDuration(file);
    if (!isValidDuration) {
      alert("Video duration should be less than 60 seconds");
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowAttachmentBar(false);
    console.log("🎥 Video selected for group chat:", file.name);
    event.target.value = '';
  };

  // Handle GIF selection
  const handleGifSelect = (gif) => {
    try {
      console.log("🎬 GIF selected for group chat:", gif);
      
      const gifData = {
        url: gif.url || gif.images?.original?.url,
        type: 'gif',
        filename: `gif-${Date.now()}.gif`,
        size: gif.images?.original?.size || 0,
        isGif: true
      };

      setSelectedFile(gifData);
      setShowGifPicker(false);
      console.log("🎬 GIF ready for group chat:", gifData.filename);
      
    } catch (error) {
      console.error("❌ Error selecting GIF for group:", error);
      alert("GIF select karne mein error aaya");
    }
  };

  // Send media message to group
  const sendMediaMessage = async (file, caption = '') => {
    console.log("🚀 === GROUP MEDIA MESSAGE SEND START ===");
    
    if (!group?.id || !currentUserData?.getMe?.id) {
      console.error("❌ Missing group or user data");
      alert("Group ya User data missing hai");
      return;
    }

    setIsUploading(true);
    
    const isGif = file?.isGif || false;
    
    try {
      if (isGif) {
        // For GIFs, use sendGroupMessage with media data
        const mediaData = {
          url: file.url,
          type: 'gif',
          filename: file.filename,
          size: file.size
        };

        console.log("📤 Sending group GIF message:", mediaData);
        
        const response = await sendGroupMessage({
          variables: {
            groupId: group.id,
            content: caption || null,
            messageType: 'gif',
            media: mediaData,
            replyTo: replyToMsg?._id || replyToMsg?.id || null
          }
        });

        if (response?.data?.sendGroupMessage) {
          console.log("✅ Group GIF message sent successfully");
          setSelectedFile(null);
          setReplyToMsg(null);
          setMessage('');
        }
      } else {
        // For regular files, use sendGroupMessageWithFile for upload
        console.log("📤 Sending group file message:", file.name);
        
        const response = await sendGroupMessageWithFile({
          variables: {
            groupId: group.id,
            content: caption || null,
            file: file,
            replyTo: replyToMsg?._id || replyToMsg?.id || null
          }
        });

        if (response?.data?.sendGroupMessageWithFile) {
          console.log("✅ Group file message sent successfully");
          setSelectedFile(null);
          setReplyToMsg(null);
          setMessage('');
        }
      }
      
    } catch (error) {
      console.error("❌ Error sending group media message:", error);
      console.error("❌ Full error details:", error.message, error.graphQLErrors, error.networkError);
      
      let errorMessage = "Group mein media send karne mein error aaya";
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage = error.graphQLErrors[0].message;
      } else if (error.networkError) {
        errorMessage = "Network error: " + error.networkError.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle reply to message
  const handleReplyToMessage = (msg) => {
    setReplyToMsg(msg);
    console.log("💬 Replying to group message:", msg._id, "Content:", msg.content, "Sender:", msg.sender.name);
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyToMsg(null);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Do you want to delete this Message?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting group message:', messageId);
      
      await deleteGroupMessage({
        variables: { messageId }
      });

      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setShowDropdown(null);
      
      console.log('✅ Group message deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting group message:', error);
      alert('Message delete karne mein error aaya');
    }
  };

  // Handle dropdown toggle
  const toggleDropdown = (messageId) => {
    setShowDropdown(showDropdown === messageId ? null : messageId);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    // Show full date and time in a readable format
    return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b bg-white shadow-sm">
        <button
          onClick={onBack}
          className="mr-3 p-2 rounded-full hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <img
          src={group.groupImage || group.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=8B5CF6&color=fff`}
          alt={group.name}
          className="w-10 h-10 rounded-full mr-3 object-cover"
        />
        <div>
          <h3 className="font-semibold">{group.name}</h3>
          <p className="text-sm text-gray-500">{group.memberCount} members</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(msg => !msg.isDeleted).map((msg) => {
          const senderId = msg.sender._id || msg.sender.id;
          const currentUserId = currentUserData?.getMe?.id;
          const isOwnMessage = senderId === currentUserId;
          
          // Check if this message has been replied to
          const hasBeenReplied = messages.some(m => m.replyTo?._id === msg._id || m.replyTo?.id === msg._id);
          
          return (
            <div
              key={msg._id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              onMouseEnter={() => setHoveredMsgId(msg._id)}
              onMouseLeave={() => setHoveredMsgId(null)}
            >
              <div className="flex flex-col items-start relative">
                {!isOwnMessage && (
                  <img
                    src={msg.sender.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender.name)}&background=8B5CF6&color=fff`}
                    alt={msg.sender.name}
                    className="w-7 h-7 rounded-full mb-1 object-cover"
                  />
                )}
                
                {/* Dropdown button */}
                {hoveredMsgId === msg._id && (
                  <div className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <button
                      onClick={() => toggleDropdown(msg._id)}
                      className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full"
                      title="More options"
                    >
                      <MoreVertical size={14} className="text-gray-600" />
                    </button>
                    
                    {/* Dropdown menu */}
                    {showDropdown === msg._id && (
                      <div 
                        ref={dropdownRef}
                        className={`absolute ${isOwnMessage ? 'right-8' : 'left-8'} top-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-28`}
                      >
                        <button
                          onClick={() => {
                            handleReplyToMessage(msg);
                            setShowDropdown(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Reply size={14} />
                          <span>Reply</span>
                        </button>
                        
                        {/* Only show delete if it's user's own message */}
                        {isOwnMessage && (
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwnMessage
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1">{msg.sender.name}</p>
                  )}
                  
                  {/* Reply indicator */}
                  {msg.replyTo && (
                    <div className={`mb-2 p-2 rounded border-l-4 ${
                      isOwnMessage 
                        ? 'bg-purple-400 border-purple-200' 
                        : 'bg-gray-100 border-gray-400'
                    }`}>
                      <p className={`text-xs font-medium ${isOwnMessage ? 'text-purple-100' : 'text-gray-700'}`}>
                        {msg.replyTo.sender?.name || 'Unknown User'}
                      </p>
                      <p className={`text-xs ${isOwnMessage ? 'text-purple-100' : 'text-gray-600'} mt-1`}>
                        {msg.replyTo.content || 'Media message'}
                      </p>
                    </div>
                  )}
                  
                  {/* Media content */}
                  {msg.media && (
                    <div className="mb-2">
                      {msg.media.type === 'image' || msg.media.type === 'gif' ? (
                        <img
                          src={msg.media.url}
                          alt={msg.media.filename}
                          className="max-w-full h-auto rounded-lg cursor-pointer"
                          onClick={() => window.open(msg.media.url, '_blank')}
                        />
                      ) : msg.media.type === 'video' ? (
                        <video
                          src={msg.media.url}
                          controls
                          className="max-w-full h-auto rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <FileText size={20} />
                          <span className="text-sm">{msg.media.filename}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Text content */}
                  {msg.content && <p>{msg.content}</p>}
                  
                  <div className={`flex items-center justify-between mt-1`}>
                    <p className={`text-xs ${
                      isOwnMessage ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      {formatTime(msg.createdAt)}
                    </p>
                    {hasBeenReplied && (
                      <span className={`text-xs ${
                        isOwnMessage ? 'text-purple-200' : 'text-gray-400'
                      }`}>
                        <Reply size={12} className="inline" /> replied
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 mb-2">
            {typingUsers.map((u) => (
              <img
                key={u.userId}
                src={u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.userName)}&background=8B5CF6&color=fff`}
                alt={u.userName}
                className="w-6 h-6 rounded-full object-cover"
              />
            ))}
            <span className="text-sm text-gray-600">typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-white">
        {/* Reply indicator */}
        {replyToMsg && (
          <div className="px-4 py-2 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Reply size={16} className="text-gray-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-medium">
                    Replying to {replyToMsg.sender?.name || 'Unknown User'}
                  </span>
                  <span className="text-sm text-gray-700 truncate max-w-64">
                    {replyToMsg.content || 'Media message'}
                  </span>
                </div>
              </div>
              <button
                onClick={cancelReply}
                className="text-gray-500 hover:text-red-500 ml-2"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* File preview */}
        {selectedFile && (
          <div className="px-4 py-2 bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedFile.isGif || selectedFile.type?.startsWith('image/') ? (
                  <div className="flex items-center space-x-2">
                    <Image size={16} className="text-blue-500" />
                    <span className="text-sm text-blue-700">
                      {selectedFile.isGif ? 'GIF' : 'Image'}: {selectedFile.filename || selectedFile.name}
                    </span>
                  </div>
                ) : selectedFile.type?.startsWith('video/') ? (
                  <div className="flex items-center space-x-2">
                    <Video size={16} className="text-red-500" />
                    <span className="text-sm text-red-700">
                      Video: {selectedFile.filename || selectedFile.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText size={16} className="text-blue-500" />
                    <span className="text-sm text-blue-700">
                      File: {selectedFile.filename || selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-500 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Attachment bar */}
        {showAttachmentBar && (
          <div ref={attachmentBarRef} className="px-4 py-2 bg-gray-50 border-b">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Image size={16} />
                <span className="text-sm">Photo</span>
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <Video size={16} />
                <span className="text-sm">Video</span>
              </button>
              <button
                onClick={() => setShowGifPicker(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <span className="text-sm">🎬 GIF</span>
              </button>
            </div>
          </div>
        )}

        {/* GIF Picker */}
        {showGifPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <div className="relative">
              <button
                onClick={() => setShowGifPicker(false)}
                className="absolute top-2 right-2 z-10 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
              >
                <X size={16} />
              </button>
              <GifSelector onSelect={handleGifSelect} />
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex items-center space-x-2 relative">
            {/* Attachment button */}
            <button
              type="button"
              onClick={() => setShowAttachmentBar(!showAttachmentBar)}
              className="p-2 text-gray-500 hover:text-purple-500 rounded-full hover:bg-gray-100"
            >
              <Paperclip size={20} />
            </button>

            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
              className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 pr-20"
            />
            
            {/* Emoji button */}
            <button
              type="button"
              className="absolute right-16 text-xl text-gray-500 hover:text-purple-500 focus:outline-none"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
            >
              <BsEmojiSmile />
            </button>

            {/* Send button */}
            <button
              type="submit"
              disabled={!message.trim() && !selectedFile}
              className="p-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-50"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-14 right-16 z-50 bg-white shadow-lg rounded-lg p-2 relative">
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="absolute top-1 right-1 text-gray-500 hover:text-red-500 z-10"
              >
                <X size={16} />
              </button>
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                theme="light"
              />
            </div>
          )}
        </form>

        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default GroupChat;