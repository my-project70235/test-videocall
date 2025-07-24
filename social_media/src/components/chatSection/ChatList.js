
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PhoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import EmojiMessageInput from "./EmojiMessageInput.js"; // path adjust karo
import { GetTokenFromCookie, GetRawTokenFromCookie } from '../getToken/GetToken';
import socket from "../socket_io/Socket";
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import GroupChat from './GroupChat';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USER_GROUPS, SEND_MESSAGE, SEND_MESSAGE_WITH_FILE, DELETE_MESSAGE, GET_MESSAGES, GET_ALL_USERS, GET_GROUP_UNREAD_COUNT, MARK_GROUP_MESSAGE_AS_READ } from '../../graphql/mutations';
import GifSelector from './GifPicker';
import { BsEmojiSmile } from "react-icons/bs";
import EmojiPicker from 'emoji-picker-react';
import { X } from "lucide-react";

const ChatList = ({ activeTab, createdGroups }) => {
  const [users, setUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sender, setSender] = useState();
  const [text, setText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showAttachmentBar, setShowAttachmentBar] = useState(false);
  const attachmentBarRef = useRef(null);
  const photoInputRef = useRef(null);
  const gifPickerRef = useRef(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [openMenuMsgId, setOpenMenuMsgId] = useState(null);
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [touchTimer, setTouchTimer] = useState(null);
  const [mobileMenuMsgId, setMobileMenuMsgId] = useState(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({});
  const navigate = useNavigate();

  const sampleMessages = {
    1: [
      { id: 1, text: "Hey, how are you?", sender: "them", time: "10:30 AM" },
      { id: 2, text: "I'm good, thanks! How about you?", sender: "me", time: "10:31 AM" },
    ],
    2: [
      { id: 1, text: "See you tomorrow!", sender: "them", time: "9:45 AM" },
      { id: 2, text: "Yes, looking forward to it!", sender: "me", time: "9:46 AM" }
    ]
  };

  useEffect(() => {
    try {
      const decodedUser = GetTokenFromCookie(); // JWT se user decode
      if (decodedUser?.id) {
        // Ensure ID is always a string
        const userId = decodedUser.id.toString();
        console.log("User authenticated with ID:", userId);
        
        // Set sender with string ID
        setSender({ ...decodedUser, id: userId });
        
        // Join socket room with string user ID
        if (socket.connected) {
          console.log("Socket connected, joining room:", userId);
          socket.emit("join", userId);
        } else {
          console.log("Socket not connected yet, will join on connect");
        }
        
        // Setup reconnection handler
        const handleReconnect = () => {
          console.log("Socket reconnected, rejoining room with ID:", userId);
          socket.emit("join", userId);
          
          // Request updated online users list
          setTimeout(() => {
            socket.emit("getOnlineUsers");
          }, 500);
        };
        
        // Register connect handler
        socket.on("connect", handleReconnect);
        
        // Cleanup
        return () => {
          socket.off("connect", handleReconnect);
        };
      } else {
        console.warn("No user ID found in token");
      }
    } catch (error) {
      console.error("Error decoding token or joining socket:", error);
    }
  }, []);

  // Separate useEffect for socket events to avoid dependency issues
  useEffect(() => {
    // Handle online users updates
    const handleOnlineUsersUpdate = (users) => {
      try {
        // Convert all user IDs to strings for consistent comparison
        const stringifiedUsers = users.map(id => id.toString());
        console.log("Online users received from server:", stringifiedUsers);
        
        // Create a new Set with string IDs for consistent comparison
        const onlineSet = new Set(stringifiedUsers);
        
        // Update the online users state
        setOnlineUsers(prevOnlineUsers => {
          // Create a new Set to avoid direct mutation
          const newOnlineUsers = new Set(prevOnlineUsers);
          
          // Add newly online users
          for (const userId of stringifiedUsers) {
            if (!prevOnlineUsers.has(userId)) {
              console.log(`User ${userId} is now online`);
              newOnlineUsers.add(userId);
            }
          }
          
          // Remove users who went offline
          for (const userId of prevOnlineUsers) {
            if (!stringifiedUsers.includes(userId)) {
              console.log(`User ${userId} is now offline`);
              newOnlineUsers.delete(userId);
            }
          }
          
          return newOnlineUsers;
        });
        
        // Update the users list with the latest online status
        setTimeout(() => {
          updateUsersOnlineStatus();
        }, 100);
        
        // Debug log
        console.log("Online users updated. Current user:", sender?.id);
        console.log("Is current user online:", onlineSet.has(sender?.id?.toString()));
      } catch (error) {
        console.error("Error handling online users update:", error);
      }
    };
    
    // Handle socket reconnection
    const handleReconnect = () => {
      try {
        console.log("Socket reconnected, refreshing online users");
        // When reconnected, re-join the room with string ID
        if (sender?.id) {
          const userId = sender.id.toString();
          console.log("Rejoining room with ID:", userId);
          socket.emit("join", userId);
          
          // Request updated online users list after reconnection
          console.log("Requesting updated online users list");
          setTimeout(() => {
            socket.emit("getOnlineUsers");
          }, 500); // Small delay to ensure server has processed the join event
        }
      } catch (error) {
        console.error("Error handling socket reconnection:", error);
      }
    };

    // Register event handlers
    socket.on("updateOnlineUsers", handleOnlineUsersUpdate);
    socket.on("connect", handleReconnect);

    // Request current online users on mount
    if (socket.connected) {
      console.log("Socket already connected, requesting online users");
      socket.emit("getOnlineUsers");
    }

    // Set up polling for online users every 5 seconds
    const onlineUsersPollingInterval = setInterval(() => {
      if (socket.connected) {
        console.log("Polling for online users");
        socket.emit("getOnlineUsers");
      }
    }, 5000);

    return () => {
      socket.off("updateOnlineUsers", handleOnlineUsersUpdate);
      socket.off("connect", handleReconnect);
      clearInterval(onlineUsersPollingInterval);
    };
  }, [sender?.id]);



  // Apollo queries
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useQuery(GET_ALL_USERS);
  
  const { data: groupsData, loading: groupsLoading, refetch: refetchGroups } = useQuery(GET_USER_GROUPS, {
    variables: { userId: sender?.id },
    skip: !sender?.id
  });

  const { data: messagesData, loading: messagesLoading, refetch: refetchMessages } = useQuery(GET_MESSAGES, {
    variables: { 
      senderId: sender?.id, 
      receiverId: selectedChat?.id 
    },
    skip: !sender?.id || !selectedChat?.id
  });

  // Apollo mutations
  const [sendMessageMutation] = useMutation(SEND_MESSAGE);
  const [markGroupMessageAsRead] = useMutation(MARK_GROUP_MESSAGE_AS_READ);
  const [sendMessageWithFileMutation] = useMutation(SEND_MESSAGE_WITH_FILE);
  const [deleteMessageMutation] = useMutation(DELETE_MESSAGE);

  // Update users when usersData changes
  useEffect(() => {
    if (usersData?.users) {
      console.log("Fetched users with online status:", usersData.users.map(u => ({
        id: u.id,
        name: u.name,
        isOnline: u.isOnline
      })));
      
      // Update users with real-time online status from socket
      const updatedUsers = usersData.users.map(user => ({
        ...user,
        // Override isOnline with real-time socket status if available
        isOnline: onlineUsers.has(user.id) ? true : user.isOnline
      }));
      
      setUsers(updatedUsers);
    }
  }, [usersData, onlineUsers]);
  
  // Function to update users with latest online status
  const updateUsersOnlineStatus = () => {
    setUsers(prevUsers => {
      if (!prevUsers) return prevUsers;
      
      return prevUsers.map(user => ({
        ...user,
        isOnline: onlineUsers.has(user.id) ? true : user.isOnline
      }));
    });
  };

  // Periodic refresh of user list every 10 seconds using Apollo refetch
  useEffect(() => {
    const userRefreshInterval = setInterval(() => {
      if (refetchUsers) {
        refetchUsers();
      }
    }, 10000);
    return () => {
      clearInterval(userRefreshInterval);
    };
  }, [refetchUsers]);

  // When a new group is created, refetch groups from backend
  useEffect(() => {
    if (activeTab === 'groups' && sender?.id) {
      refetchGroups && refetchGroups();
    }
  }, [createdGroups, activeTab, sender?.id, refetchGroups]);

  // Function to fetch unread counts for all groups
  const fetchGroupUnreadCounts = async () => {
    if (!groupsData?.getUserGroups || !sender?.id) {
      console.log('❌ Cannot fetch unread counts:', {
        hasGroups: !!groupsData?.getUserGroups,
        hasSender: !!sender?.id
      });
      return;
    }
    
    console.log('🔍 Fetching unread counts for groups:', groupsData.getUserGroups.length);
    const rawToken = GetRawTokenFromCookie();
    console.log('🔑 Raw token for unread count:', rawToken ? 'Present' : 'Missing');
    console.log('👤 Current sender:', { id: sender.id, name: sender.name });
    
    const counts = {};
    for (const group of groupsData.getUserGroups) {
      try {
        console.log(`📊 Fetching unread count for group: ${group.name} (${group._id})`);
        const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
        const response = await fetch(`${serverUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GetRawTokenFromCookie()}`
          },
          body: JSON.stringify({
            query: `
              query GetGroupUnreadCount($groupId: ID!) {
                getGroupUnreadCount(groupId: $groupId)
              }
            `,
            variables: { groupId: group._id }
          })
        });
        
        console.log(`📡 Response status for ${group.name}:`, response.status, response.statusText);
        
        if (!response.ok) {
          console.error(`❌ HTTP error for group ${group.name}:`, response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error response body:', errorText.substring(0, 200));
          continue; // Skip this group and continue with others
        }
        
        const result = await response.json();
        console.log(`📋 Response for group ${group.name}:`, result);
        
        if (result.errors) {
          console.error(`❌ GraphQL errors for group ${group.name}:`, result.errors);
        }
        
        if (result.data?.getGroupUnreadCount !== undefined) {
          counts[group._id] = result.data.getGroupUnreadCount;
          console.log(`✅ Unread count for ${group.name}: ${result.data.getGroupUnreadCount}`);
        } else {
          console.warn(`⚠️ No unread count data for group ${group.name}`);
        }
      } catch (error) {
        console.error('❌ Error fetching unread count for group:', group._id, error);
      }
    }
    
    setGroupUnreadCounts(counts);
  };

  // Fetch unread counts when groups data changes
  useEffect(() => {
    console.log('🔄 useEffect triggered for unread counts:', {
      activeTab,
      hasGroupsData: !!groupsData?.getUserGroups,
      groupsCount: groupsData?.getUserGroups?.length,
      senderId: sender?.id,
      senderName: sender?.name
    });
    
    if (activeTab === 'groups' && groupsData?.getUserGroups && sender?.id) {
      console.log('✅ All conditions met, fetching unread counts...');
      fetchGroupUnreadCounts();
    } else {
      console.log('❌ Conditions not met for fetching unread counts');
    }
  }, [groupsData, activeTab, sender?.id]);

  // Periodic refresh of unread counts every 30 seconds
  useEffect(() => {
    if (activeTab === 'groups') {
      const interval = setInterval(() => {
        fetchGroupUnreadCounts();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab, groupsData]);

  // Listen for new group messages to update unread counts
  useEffect(() => {
    if (activeTab === 'groups' && sender?.id) {
      const handleNewGroupMessage = (newMessage) => {
        // Only update unread count if the message is not from current user
        // and the group is not currently selected
        if (newMessage.sender.id !== sender.id && 
            (!selectedChat || selectedChat.id !== newMessage.group._id)) {
          setGroupUnreadCounts(prev => ({
            ...prev,
            [newMessage.group._id]: (prev[newMessage.group._id] || 0) + 1
          }));
        }
      };

      socket.on('newGroupMessage', handleNewGroupMessage);

      return () => {
        socket.off('newGroupMessage', handleNewGroupMessage);
      };
    }
  }, [activeTab, sender?.id, selectedChat]);

  // Refresh unread counts when switching to groups tab
  useEffect(() => {
    if (activeTab === 'groups' && groupsData?.getUserGroups && sender?.id) {
      console.log('🔄 Tab switched to groups, fetching unread counts...');
      // Small delay to ensure UI is ready
      setTimeout(() => {
        fetchGroupUnreadCounts();
      }, 100);
    }
  }, [activeTab]);

  // Fetch unread counts when sender becomes available (important for page refresh)
  useEffect(() => {
    if (sender?.id && activeTab === 'groups' && groupsData?.getUserGroups) {
      console.log('👤 Sender available, fetching unread counts for page refresh...');
      // Add a small delay to ensure everything is properly initialized
      setTimeout(() => {
        fetchGroupUnreadCounts();
      }, 500);
    }
  }, [sender?.id]);

  // Additional effect to ensure unread counts are fetched on component mount
  useEffect(() => {
    if (activeTab === 'groups') {
      console.log('🔄 Component mounted with groups tab active');
      // Retry mechanism for fetching unread counts
      const retryFetch = () => {
        if (sender?.id && groupsData?.getUserGroups) {
          console.log('🔄 Retry: All data available, fetching unread counts...');
          fetchGroupUnreadCounts();
        } else {
          console.log('🔄 Retry: Data not ready yet, will try again...');
          setTimeout(retryFetch, 1000);
        }
      };
      
      // Start retry mechanism after a short delay
      setTimeout(retryFetch, 200);
    }
  }, []); // Only run on mount

  let receiverId = selectedChat?.id;

  // Update messages when messagesData changes
  useEffect(() => {
    if (messagesData?.getMessages) {
      setMessages(messagesData.getMessages);
    }
  }, [messagesData]);

  useEffect(() => {
    if (sender?.id && socket?.connected) {
      socket.emit("join", sender.id.toString());
    }
  }, [sender?.id]);

  const handleChatSelect = async (user) => {
    try {
      setIsAnimating(true);
      setSelectedChat(user);
      
      // If it's a group, mark all unread messages as read
      if (user.isGroup && user.id) {
        const previousCount = groupUnreadCounts[user.id] || 0;
        
        // Reset unread count immediately for better UX
        setGroupUnreadCounts(prev => ({
          ...prev,
          [user.id]: 0
        }));
        
        // Mark messages as read in the background
        try {
          // Get all unread messages for this group and mark them as read
          const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
        const response = await fetch(`${serverUrl}/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GetRawTokenFromCookie()}`
            },
            body: JSON.stringify({
              query: `
                query GetGroupMessages($groupId: ID!, $limit: Int, $offset: Int) {
                  getGroupMessages(groupId: $groupId, limit: $limit, offset: $offset) {
                    _id
                    sender {
                      id
                    }
                    readBy {
                      user {
                        id
                      }
                    }
                  }
                }
              `,
              variables: { groupId: user.id, limit: 50, offset: 0 }
            })
          });
          
          const result = await response.json();
          if (result.data?.getGroupMessages) {
            // Find messages not read by current user (excluding own messages)
            const unreadMessages = result.data.getGroupMessages.filter(msg => 
              msg.sender.id !== sender?.id && // Exclude own messages
              !msg.readBy.some(read => read.user.id === sender?.id)
            );
            
            console.log(`📖 Marking ${unreadMessages.length} messages as read for group ${user.id}`);
            
            // Mark each unread message as read
            for (const message of unreadMessages) {
              try {
                await markGroupMessageAsRead({
                  variables: { messageId: message._id }
                });
              } catch (error) {
                console.error('Error marking message as read:', message._id, error);
              }
            }
          }
        } catch (error) {
          console.error('Error marking group messages as read:', error);
          // If there's an error, restore the previous count
          setGroupUnreadCounts(prev => ({
            ...prev,
            [user.id]: previousCount
          }));
        }
      }
      
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      console.error("Error selecting chat:", error);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      event.target.value = ''; // Reset file input
      return;
    }

    setSelectedFile(file);
    setShowAttachmentBar(false);
    
    // Don't send immediately - just show preview
    console.log("📁 File selected for preview:", file.name);
    
    // Reset file input
    event.target.value = '';
  };

  // Handle GIF selection (similar to file selection - just set selected GIF)
  const handleGifSelect = (gif) => {
    try {
      console.log("🎬 GIF selected for preview:", gif);
      
      // Create a GIF object similar to file structure
      const gifData = {
        url: gif.url || gif.images?.original?.url,
        type: 'gif',
        filename: `gif-${Date.now()}.gif`,
        size: gif.images?.original?.size || 0,
        isGif: true // Flag to identify it's a GIF
      };

      setSelectedFile(gifData);
      setShowGifPicker(false);
      
      // Don't send immediately - just show preview like images
      console.log("🎬 GIF selected for preview:", gifData.filename);
      
    } catch (error) {
      console.error("❌ Error selecting GIF:", error);
      alert("GIF select karne mein error aaya");
    }
  };

  // Send media message using GraphQL mutation (with optional text caption)
  const sendMediaMessage = async (file, caption = '') => {
    console.log("🚀 === GRAPHQL MEDIA MESSAGE SEND DEBUG START ===");
    console.log("📋 Initial State:", {
      senderId: sender?.id,
      receiverId: selectedChat?.id,
      fileName: file?.name || file?.filename,
      fileType: file?.type,
      fileSize: file?.size,
      isGif: file?.isGif,
      caption: caption
    });

    if (!sender?.id || !selectedChat?.id) {
      console.error("❌ Missing sender or receiver");
      alert("Sender ya Receiver select nahi hua");
      return;
    }

    setIsUploading(true);
    
    // Check if it's a GIF (already has URL) or regular file (needs upload)
    const isGif = file?.isGif || false;
    
    // Create temporary message with media for immediate UI feedback
    const tempMessage = {
      id: `temp-${Date.now()}`,
      message: caption || null, // Include caption if provided
      media: {
        url: isGif ? file.url : URL.createObjectURL(file), // Use GIF URL directly or create object URL for files
        type: isGif ? 'gif' : (file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'),
        filename: file.filename || file.name,
        size: file.size
      },
      createdAt: new Date().toISOString(),
      sender: {
        id: sender.id,
        name: sender.name
      },
      receiver: {
        id: selectedChat.id,
        name: selectedChat.name
      },
      isTemporary: true // Flag to identify temporary messages
    };
    
    try {
      console.log("📱 STEP 1: Adding temporary message to UI");
      setMessages(prev => {
        console.log("📊 Current messages count before adding temp:", prev.length);
        const newMessages = [...prev, tempMessage];
        console.log("📊 Messages count after adding temp:", newMessages.length);
        return newMessages;
      });

      if (isGif) {
        // For GIFs, use existing sendMessage mutation with media data
        console.log("🎬 STEP 2: Processing GIF with existing sendMessage mutation");
        const mediaData = {
          url: file.url,
          type: 'gif',
          filename: file.filename,
          size: file.size
        };

        console.log("📤 STEP 3: Starting GraphQL sendMessage mutation for GIF");
        const mutationStartTime = Date.now();
        const response = await sendMessageMutation({
          variables: {
            senderId: sender?.id,
            receiverId: selectedChat?.id,
            message: caption || null,
            media: mediaData
          }
        });
        const mutationEndTime = Date.now();

        console.log("✅ STEP 3 COMPLETE: GraphQL mutation finished");
        console.log("⏱️ Mutation time:", mutationEndTime - mutationStartTime, "ms");

        // Replace temporary message with real one
        if (response?.data?.sendMessage) {
          const realMessage = response.data.sendMessage;
          console.log("🔄 Replacing temporary GIF message with real message");
          
          setMessages(prev => {
            const replaced = prev.map(msg => {
              if (msg.id === tempMessage.id) {
                return realMessage;
              }
              return msg;
            });
            return replaced;
          });
        }
      } else {
        // For regular files, use new sendMessageWithFile mutation
        console.log("📤 STEP 2: Using GraphQL sendMessageWithFile mutation for regular files");
        console.log("📁 File details:", {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        });

        const mutationStartTime = Date.now();
        const response = await sendMessageWithFileMutation({
          variables: {
            senderId: sender?.id,
            receiverId: selectedChat?.id,
            message: caption || null,
            file: file // Direct file upload through GraphQL
          }
        });
        const mutationEndTime = Date.now();

        console.log("✅ STEP 2 COMPLETE: GraphQL sendMessageWithFile mutation finished");
        console.log("⏱️ Mutation time:", mutationEndTime - mutationStartTime, "ms");
        console.log("📋 GraphQL response:", {
          hasData: !!response?.data,
          hasSendMessageWithFile: !!response?.data?.sendMessageWithFile,
          messageId: response?.data?.sendMessageWithFile?.id,
          messageMedia: response?.data?.sendMessageWithFile?.media
        });

        // Replace temporary message with real one
        if (response?.data?.sendMessageWithFile) {
          const realMessage = response.data.sendMessageWithFile;
          console.log("🔄 Replacing temporary file message with real message");
          console.log("📋 Real message data:", {
            id: realMessage.id,
            mediaUrl: realMessage.media?.url,
            mediaType: realMessage.media?.type,
            mediaFilename: realMessage.media?.filename,
            senderId: realMessage.sender?.id,
            receiverId: realMessage.receiver?.id
          });
          
          setMessages(prev => {
            const replaced = prev.map(msg => {
              if (msg.id === tempMessage.id) {
                console.log("✅ Successfully replaced temporary message with real message");
                return realMessage;
              }
              return msg;
            });
            console.log("📊 Messages after replacement:", replaced.length);
            return replaced;
          });
        }
      }

      console.log("✅ Media message sent successfully using GraphQL!");
      
      // Refresh messages to ensure consistency
      if (refetchMessages) {
        console.log("🔄 Scheduling message refetch in 500ms");
        setTimeout(() => {
          refetchMessages();
        }, 500);
      }

      // Scroll to bottom
      setTimeout(() => {
        const chatContainer = document.querySelector('.overflow-y-auto');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);

    } catch (error) {
      console.error("❌ === GRAPHQL MEDIA MESSAGE SEND ERROR ===");
      console.error("❌ Error type:", error.constructor.name);
      console.error("❌ Error message:", error.message);
      console.error("❌ Full error:", error);
      
      // Remove temporary message on error
      console.log("🗑️ Removing temporary message due to error:", tempMessage.id);
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempMessage.id);
        console.log("📊 Messages after error cleanup:", filtered.length);
        return filtered;
      });
      
      // Detailed error analysis
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error("🔗 GRAPHQL ERROR:");
        console.error("📋 GraphQL errors:", error.graphQLErrors);
        error.graphQLErrors.forEach((gqlError, index) => {
          console.error(`📋 GraphQL Error ${index + 1}:`, {
            message: gqlError.message,
            locations: gqlError.locations,
            path: gqlError.path,
            extensions: gqlError.extensions
          });
        });
        alert(`Failed to send message: ${error.graphQLErrors[0].message}`);
      } else if (error.networkError) {
        console.error("🌐 NETWORK ERROR:");
        console.error("📋 Network error details:", error.networkError);
        alert("Network error occurred. Please check your connection.");
      } else {
        console.error("❓ UNKNOWN ERROR:");
        console.error("📋 Error stack:", error.stack);
        alert("Failed to send media. Please try again.");
      }
      
      console.log("❌ === GRAPHQL MEDIA MESSAGE SEND ERROR END ===");
    } finally {
      console.log("🏁 FINALLY: Cleaning up upload state");
      setIsUploading(false);
      setSelectedFile(null);
      setText(''); // Clear text input as well
      console.log("🚀 === GRAPHQL MEDIA MESSAGE SEND DEBUG END ===");
    }
  };

  const handleEmojiSelect = (event, emojiObject) => {
    setText((prev) => prev + (emojiObject?.emoji || event?.emoji));
  };

  const chat = async () => {
    // Check if we have a selected file to send
    if (selectedFile) {
      console.log("📤 Sending selected file with caption:", selectedFile.name, text);
      await sendMediaMessage(selectedFile, text.trim()); // Pass text as caption
      return;
    }
    
    // For text messages
    if (!text.trim()) return;
    
    if (!sender?.id || !selectedChat?.id) {
      alert("Sender ya Receiver select nahi hua");
      return;
    }
    try {
      let finalMessage = text;
      let replyMeta = null;
      if (replyToMsg) {
        // Prepend quoted text for UI
        finalMessage = `> ${replyToMsg.message}\n${text}`;
        replyMeta = { replyToId: replyToMsg.id, replyToText: replyToMsg.message };
      }
      
      // Create a temporary message to display immediately
      const tempMessage = {
        id: `temp-${Date.now()}`,
        message: finalMessage,
        createdAt: new Date().toISOString(),
        sender: {
          id: sender.id,
          name: sender.name
        },
        receiver: {
          id: selectedChat.id,
          name: selectedChat.name
        },
        isTemporary: true // Flag to identify temporary messages
      };
      
      // Add the temporary message to the UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Scroll to bottom to show the new message
      setTimeout(() => {
        const chatContainer = document.querySelector('.overflow-y-auto');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);
      
      // Clear input after send
      setText("");
      setReplyToMsg(null);
      
      // Now send the message to the server using GraphQL mutation
      const response = await sendMessageMutation({
        variables: {
          senderId: sender?.id,
          receiverId: selectedChat?.id,
          message: finalMessage,
          media: null
        }
      });
      
      // Replace the temporary message with the real one from the server
      if (response?.data?.sendMessage) {
        const realMessage = response.data.sendMessage;
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? realMessage : msg
        ));
      }
    } catch (error) {
      console.error(error.response?.data?.errors?.[0]?.message || "Unknown error");
      // If there's an error, remove the temporary message
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      alert("Failed to send message. Please try again.");
    }
  }
  
  // Function to delete a message
  const deleteMessage = async (messageId) => {
    try {
      const response = await deleteMessageMutation({
        variables: {
          messageId: messageId
        }
      });
      
      // Close any open menus
      setOpenMenuMsgId(null);
      setMobileMenuMsgId(null);
      
      // The socket event will handle removing the message from the UI
      console.log("Message deleted:", messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
    }
  }

  // Direct socket event handler
  useEffect(() => {
    if (!socket) return;
    
    const handleIncomingMessage = (msg) => {
      console.log("📨 === SOCKET MESSAGE RECEIVED ===");
      console.log("📋 Message details:", {
        id: msg.id,
        hasMessage: !!msg.message,
        messageText: msg.message ? msg.message.substring(0, 50) + "..." : null,
        hasMedia: !!msg.media,
        mediaType: msg.media?.type,
        mediaFilename: msg.media?.filename,
        mediaUrl: msg.media?.url ? msg.media.url.substring(0, 50) + "..." : null,
        senderId: msg.sender?.id,
        senderName: msg.sender?.name,
        receiverId: msg.receiver?.id,
        receiverName: msg.receiver?.name,
        createdAt: msg.createdAt
      });
      
      console.log("🔍 Current chat context:", {
        selectedChatId: selectedChat?.id,
        selectedChatName: selectedChat?.name,
        currentUserId: sender?.id,
        currentUserName: sender?.name
      });
      
      // If we have a selected chat and the message is related to it, update the messages
      const isRelevantMessage = selectedChat && (
        msg.sender.id === selectedChat.id ||
        msg.receiver.id === selectedChat.id
      );
      
      console.log("🔍 Message relevance check:", {
        isRelevantMessage,
        senderMatchesChat: msg.sender.id === selectedChat?.id,
        receiverMatchesChat: msg.receiver.id === selectedChat?.id
      });
      
      if (isRelevantMessage) {
        console.log("✅ Message is relevant to current chat, processing...");
        // Update messages state with the new message
        setMessages(prev => {
          console.log("📊 Current messages count:", prev.length);
          console.log("🔍 Checking for existing message with ID:", msg.id);
          
          // Check if this message is already in our list (to avoid duplicates)
          const messageExists = prev.some(existingMsg => {
            const exists = existingMsg.id === msg.id;
            if (exists) {
              console.log("⚠️ Message already exists in list:", existingMsg.id);
            }
            return exists;
          });
          
          // Check if this is a message we sent (already in our state with a temp ID)
          // Handle both text messages and media messages
          const isOurTempMessage = prev.some(existingMsg => {
            if (!existingMsg.id.startsWith('temp-')) return false;
            
            // For text messages
            if (msg.message && existingMsg.message) {
              const isMatch = existingMsg.message === msg.message &&
                             existingMsg.sender.id === msg.sender.id &&
                             existingMsg.receiver.id === msg.receiver.id;
              if (isMatch) {
                console.log("🔍 Socket: Found matching temporary text message:", existingMsg.id);
              }
              return isMatch;
            }
            
            // For media messages
            if (msg.media && existingMsg.media) {
              const isMatch = existingMsg.sender.id === msg.sender.id &&
                             existingMsg.receiver.id === msg.receiver.id &&
                             existingMsg.media.filename === msg.media.filename &&
                             existingMsg.media.type === msg.media.type;
              if (isMatch) {
                console.log("🔍 Socket: Found matching temporary media message:", existingMsg.id);
              }
              return isMatch;
            }
            
            return false;
          });
          
          if (messageExists) {
            console.log("⚠️ Message already exists, skipping");
            return prev;
          }
          
          console.log("🔍 Checking for temporary message to replace...");
          console.log("📋 isOurTempMessage:", isOurTempMessage);
          console.log("📋 msg.sender.id === sender?.id:", msg.sender.id === sender?.id);
          
          // If this is our own message that we already added as a temp message,
          // replace the temp message with the real one
          if (isOurTempMessage && msg.sender.id === sender?.id) {
            console.log("🔄 Socket: Found temporary message to replace, processing...");
            return prev.map(existingMsg => {
              if (!existingMsg.id.startsWith('temp-')) {
                return existingMsg;
              }
              
              console.log("🔍 Checking temp message:", existingMsg.id);
              
              // For text messages
              if (msg.message && existingMsg.message) {
                const textMatch = existingMsg.message === msg.message &&
                                 existingMsg.sender.id === msg.sender.id &&
                                 existingMsg.receiver.id === msg.receiver.id;
                console.log("📝 Text message match check:", {
                  messageMatch: existingMsg.message === msg.message,
                  senderMatch: existingMsg.sender.id === msg.sender.id,
                  receiverMatch: existingMsg.receiver.id === msg.receiver.id,
                  overallMatch: textMatch
                });
                
                if (textMatch) {
                  console.log("✅ Socket: Replaced text message:", existingMsg.id, "->", msg.id);
                  return msg;
                }
              }
              
              // For media messages
              if (msg.media && existingMsg.media) {
                const mediaMatch = existingMsg.sender.id === msg.sender.id &&
                                  existingMsg.receiver.id === msg.receiver.id &&
                                  existingMsg.media.filename === msg.media.filename &&
                                  existingMsg.media.type === msg.media.type;
                console.log("📸 Media message match check:", {
                  senderMatch: existingMsg.sender.id === msg.sender.id,
                  receiverMatch: existingMsg.receiver.id === msg.receiver.id,
                  filenameMatch: existingMsg.media.filename === msg.media.filename,
                  typeMatch: existingMsg.media.type === msg.media.type,
                  overallMatch: mediaMatch,
                  existingFilename: existingMsg.media.filename,
                  incomingFilename: msg.media.filename,
                  existingType: existingMsg.media.type,
                  incomingType: msg.media.type
                });
                
                if (mediaMatch) {
                  console.log("✅ Socket: Replaced media message:", existingMsg.id, "->", msg.id);
                  return msg;
                }
              }
              
              return existingMsg;
            });
          }
          
          console.log("➕ Adding new message to list");
          const newMessages = [...prev, msg];
          console.log("📊 Messages count after adding:", newMessages.length);
          return newMessages;
        });
        
        // Force refresh the UI to ensure the message appears
        setTimeout(() => {
          const chatContainer = document.querySelector('.overflow-y-auto');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
            console.log("📜 Scrolled to bottom after socket message");
          }
        }, 100);
        
        console.log("✅ Socket message processing complete");
      } else {
        console.log("⚠️ Message not relevant to current chat, ignoring");
      }
      
      console.log("📨 === SOCKET MESSAGE PROCESSED ===");
    };

    // Handle message deletion events
    const handleMessageDeleted = (deleteInfo) => {
      console.log("Socket message deleted event received:", deleteInfo);
      
      // Remove the deleted message from our messages state
      setMessages(prev => prev.filter(msg => msg.id !== deleteInfo.messageId));
    };
    
    // Add socket event listeners
    socket.on("receiveMessage", handleIncomingMessage);
    socket.on("messageDeleted", handleMessageDeleted);

    // Cleanup on unmount
    return () => {
      socket.off("receiveMessage", handleIncomingMessage);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [selectedChat]);
  
  // Add a polling mechanism as a fallback
  useEffect(() => {
    if (!selectedChat || !sender) return;
    
    // Poll for new messages every 3 seconds
    const intervalId = setInterval(() => {
      if (refetchMessages) {
        refetchMessages();
      }
    }, 3000);
    
    // Cleanup stuck temporary messages after 30 seconds
    const cleanupInterval = setInterval(() => {
      setMessages(prev => {
        const now = Date.now();
        return prev.filter(msg => {
          if (msg.isTemporary && msg.id.startsWith('temp-')) {
            const messageTime = parseInt(msg.id.split('-')[1]);
            const timeDiff = now - messageTime;
            // Remove temporary messages older than 30 seconds
            if (timeDiff > 30000) {
              console.log('Removing stuck temporary message:', msg.id);
              return false;
            }
          }
          return true;
        });
      });
    }, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(intervalId);
      clearInterval(cleanupInterval);
    };
  }, [selectedChat, sender, refetchMessages]);

  useEffect(() => {
    if (!showAttachmentBar) return;
    
    try {
      function handleClickOutside(event) {
        try {
          if (attachmentBarRef.current && !attachmentBarRef.current.contains(event.target)) {
            setShowAttachmentBar(false);
          }
        } catch (error) {
          console.error("Error handling click outside attachment bar:", error);
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        try {
          document.removeEventListener('mousedown', handleClickOutside);
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up attachment bar click handler:", error);
    }
  }, [showAttachmentBar]);

  useEffect(() => {
    if (!showGifPicker) return;
    
    try {
      function handleClickOutside(event) {
        try {
          if (gifPickerRef.current && !gifPickerRef.current.contains(event.target)) {
            setShowGifPicker(false);
          }
        } catch (error) {
          console.error("Error handling click outside GIF picker:", error);
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        try {
          document.removeEventListener('mousedown', handleClickOutside);
        } catch (error) {
          console.error("Error removing GIF picker event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up GIF picker click handler:", error);
    }
  }, [showGifPicker]);

  // Close GIF picker when attachment bar is closed
  useEffect(() => {
    if (!showAttachmentBar && showGifPicker) {
      setShowGifPicker(false);
    }
  }, [showAttachmentBar, showGifPicker]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    
    try {
      function handleClickOutside(event) {
        try {
          if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
            setHeaderMenuOpen(false);
          }
        } catch (error) {
          console.error("Error handling click outside header menu:", error);
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        try {
          document.removeEventListener('mousedown', handleClickOutside);
        } catch (error) {
          console.error("Error removing event listener:", error);
        }
      };
    } catch (error) {
      console.error("Error setting up header menu click handler:", error);
    }
  }, [headerMenuOpen]);
   const videocall = () => {
     if (!selectedChat) {
       alert('Please select a user to call');
       return;
     }

     const decodedUser = GetTokenFromCookie();
     const roomID = `room_${Date.now()}`;
     const callerID = decodedUser?.id;
     const calleeID = selectedChat.id;

     console.log('📞 Initiating video call:', { callerID, calleeID, roomID });

     // Send socket event to notify callee
     socket.emit("call-user", {
       calleeID,
       roomID,
       callerID,
       callerName: decodedUser?.name,
       callerImage: decodedUser?.profileImage
     });

     // Show calling status to caller
     const callingToast = alert(`📞 Calling ${selectedChat.name || selectedChat.username}...\nWaiting for response...`);
     
     // Listen for call response
     const handleCallAccepted = ({ roomID: acceptedRoomID, calleeID: acceptedCalleeID }) => {
       if (acceptedRoomID === roomID) {
         console.log('✅ Call accepted by callee');
         socket.off('call-accepted', handleCallAccepted);
         socket.off('call-declined', handleCallDeclined);
         navigate(`/video-call?roomID=${roomID}&userID=${callerID}`);
       }
     };

     const handleCallDeclined = ({ roomID: declinedRoomID }) => {
       if (declinedRoomID === roomID) {
         console.log('❌ Call declined by callee');
         socket.off('call-accepted', handleCallAccepted);
         socket.off('call-declined', handleCallDeclined);
         alert(`❌ ${selectedChat.name || selectedChat.username} declined the call`);
       }
     };

     // Set up listeners for call response
     socket.on('call-accepted', handleCallAccepted);
     socket.on('call-declined', handleCallDeclined);

     // Auto cleanup after 30 seconds if no response
     setTimeout(() => {
       socket.off('call-accepted', handleCallAccepted);
       socket.off('call-declined', handleCallDeclined);
       console.log('⏰ Call timeout - no response');
       alert(`⏰ ${selectedChat.name || selectedChat.username} didn't answer the call`);
     }, 30000);
   }

 

  // Filter users for group or all chats based on activeTab
  let displayedUsers = Array.isArray(users) ? users : [];
  if (activeTab === 'groups') {
    // Show backend groups, plus any new groups created in this session (not yet in backend response)
    const backendGroups = (groupsData?.getUserGroups || []).map(g => ({
      ...g,
      id: g._id,
      isGroup: true,
      profileImage: g.groupImage // for compatibility
    }));
    // Add any createdGroups not present in backendGroups (by id)
    const sessionGroups = (Array.isArray(createdGroups) ? createdGroups : []).filter(
      cg => !backendGroups.some(bg => bg.id === cg.id)
    );
    displayedUsers = [...backendGroups, ...sessionGroups];
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Chat List */}
      <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden transition-all duration-300 ease-in-out md:ml-8 ${selectedChat ? 'hidden md:block' : 'block'}`}>
        <div className="overflow-y-auto h-full custom-scrollbar">


          {activeTab === 'groups' && displayedUsers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm p-8">There is no group chat</div>
          ) : (
            displayedUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleChatSelect(user)}
                className={`flex items-center p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50/80 ${selectedChat?.id === user.id ? 'bg-purple-50' : ''}`}
              >
                <div className="flex items-center w-full">
                  <div className="relative flex-shrink-0">
                    {user.isGroup ? (
                      <img
                        src={user.groupImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8B5CF6&color=fff`}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100"
                      />
                    ) : (
                      <img
                        src={user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100"
                      />
                    )}
                    <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${onlineUsers.has(user.id) || user.isOnline === true ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} transition-colors duration-300`}></span>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{user.name}</h3>
                    <p className={`text-xs ${onlineUsers.has(user.id) || user.isOnline === true ? 'text-green-500' : 'text-gray-400'} truncate transition-colors duration-300 flex items-center`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${onlineUsers.has(user.id) || user.isOnline === true ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} transition-colors duration-300`}></span>
                      {onlineUsers.has(user.id) || user.isOnline === true ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  
                  {/* Unread count badge for groups */}
                  {user.isGroup && groupUnreadCounts[user.id] > 0 && (
                    <div className="flex-shrink-0 ml-2">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[20px] h-5">
                        {groupUnreadCounts[user.id] > 99 ? '99+' : groupUnreadCounts[user.id]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full min-h-0">
        {selectedChat ? (
          selectedChat.isGroup ? (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:ml-8 md:mr-4 overflow-hidden h-full">
              <GroupChat 
                group={selectedChat} 
                onBack={() => setSelectedChat(null)} 
              />
            </div>
          ) : (
          <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:ml-8 md:mr-4 overflow-hidden transform transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="flex-none border-b border-gray-100 p-4 flex items-center justify-between bg-white">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden mr-2 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <img
                  src={selectedChat.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}`}
                  alt={selectedChat.name}
                  className="w-12 h-12 rounded-full ring-2 ring-purple-100"
                />
                <div className="ml-3">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedChat.name}</h2>
                  <p className={`text-xs flex items-center ${onlineUsers.has(selectedChat?.id) || selectedChat?.isOnline === true ? 'text-green-500' : 'text-gray-400'} transition-colors duration-300`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${onlineUsers.has(selectedChat?.id) || selectedChat?.isOnline === true ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} transition-colors duration-300`}></span>
                    {onlineUsers.has(selectedChat?.id) || selectedChat?.isOnline === true ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 mb-[80px] md:mb-0 relative">
                <button className="p-2 hover:bg-gray-100 rounded-full"><PhoneIcon className="h-5 w-5 text-gray-600" /></button>
                <button className="p-2 hover:bg-gray-100 rounded-full" onClick={videocall}><VideoCameraIcon className="h-5 w-5 text-gray-600" /></button>
                <button className="p-2 hover:bg-gray-100 rounded-full" onClick={() => setHeaderMenuOpen((v) => !v)} ref={headerMenuRef}>
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                </button>
                {headerMenuOpen && (
                  <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-32 flex flex-col animate-fadeIn">
                    <button className="px-4 py-2 text-left text-sm hover:bg-red-100 text-red-600 font-semibold" type="button">Block</button>
                  </div>
                )}
              </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 bg-gray-50">
              <div className="space-y-4">
                {Array.isArray(messages) && messages.length > 0 && messages.map((msg) => {
                  const isSent = msg?.sender?.id === sender?.id;
                  let quoted = null;
                  let mainText = msg.message;
                  if (msg.message && msg.message.startsWith('> ')) {
                    const split = msg.message.split('\n');
                    quoted = split[0].replace('> ', '');
                    mainText = split.slice(1).join('\n');
                  }
                  // Mobile long-press handlers
                  const handleTouchStart = () => {
                    if (window.innerWidth < 768) {
                      const timer = setTimeout(() => {
                        setMobileMenuMsgId(msg.id);
                      }, 500);
                      setTouchTimer(timer);
                    }
                  };
                  const handleTouchEnd = () => {
                    if (window.innerWidth < 768 && touchTimer) {
                      clearTimeout(touchTimer);
                      setTouchTimer(null);
                    }
                  };
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? 'justify-end' : 'justify-start'} relative`}
                      onMouseEnter={() => setHoveredMsgId(msg.id)}
                      onMouseLeave={() => { setHoveredMsgId(null); setOpenMenuMsgId(null); }}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* For sent messages, arrow/menu on left; for received, on right (desktop only) */}
                      {isSent && hoveredMsgId === msg.id && (
                        <div className="hidden md:flex items-center mr-2 relative">
                          <button
                            className={`p-1 rounded-full hover:bg-gray-200 focus:outline-none transition-transform duration-200 ${openMenuMsgId === msg.id ? 'rotate-180' : ''}`}
                            onClick={e => { e.stopPropagation(); setOpenMenuMsgId(msg.id); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openMenuMsgId === msg.id && (
                            <div className="absolute z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-32 flex flex-col animate-fadeIn"
                              style={{ right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px', animation: 'fadeInLeft 0.2s' }}
                            >
                              <button className="px-4 py-2 text-left text-sm hover:bg-gray-100" type="button" onClick={() => { setReplyToMsg(msg); setOpenMenuMsgId(null); }}>Reply</button>
                              <button className="px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-500" type="button" onClick={() => { deleteMessage(msg.id); setOpenMenuMsgId(null); }}>Delete</button>
                              <button className="px-4 py-2 text-left text-sm hover:bg-red-100 text-red-600 font-semibold" type="button">Block</button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isSent ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2`}>
                        {quoted && (
                          <div className="text-xs text-purple-300 border-l-4 border-purple-400 pl-2 mb-1 whitespace-pre-line">{quoted}</div>
                        )}
                        
                        {/* Media content */}
                        {msg.media && (
                          <div className="mb-2">
                            {msg.media.type === 'image' && (
                              <img 
                                src={msg.media.url} 
                                alt={msg.media.filename}
                                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.media.url, '_blank')}
                                style={{ maxHeight: '200px' }}
                              />
                            )}
                            {msg.media.type === 'gif' && (
                              <img 
                                src={msg.media.url} 
                                alt={msg.media.filename}
                                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.media.url, '_blank')}
                                style={{ maxHeight: '200px' }}
                              />
                            )}
                            {msg.media.type === 'video' && (
                              <video 
                                src={msg.media.url} 
                                controls
                                className="max-w-full h-auto rounded-lg"
                                style={{ maxHeight: '200px' }}
                              />
                            )}
                            {msg.media.type === 'file' && (
                              <div className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{msg.media.filename}</p>
                                  <p className="text-xs opacity-70">{(msg.media.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button 
                                  onClick={() => window.open(msg.media.url, '_blank')}
                                  className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition-colors"
                                >
                                  Download
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Text message */}
                        {mainText && <p className="text-sm whitespace-pre-line">{mainText}</p>}
                        
                        <span className={`text-xs mt-1 block ${isSent ? 'text-purple-200' : 'text-gray-500'}`}>
                          {moment(msg.createdAt).format('hh:mm A')}
                        </span>
                      </div>
                      {!isSent && hoveredMsgId === msg.id && (
                        <div className="hidden md:flex items-center ml-2 relative">
                          <button
                            className={`p-1 rounded-full hover:bg-gray-200 focus:outline-none transition-transform duration-200 ${openMenuMsgId === msg.id ? 'rotate-180' : ''}`}
                            onClick={e => { e.stopPropagation(); setOpenMenuMsgId(msg.id); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {openMenuMsgId === msg.id && (
                            <div className="absolute z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-32 flex flex-col animate-fadeIn"
                              style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px', animation: 'fadeInLeft 0.2s' }}
                            >
                              <button className="px-4 py-2 text-left text-sm hover:bg-gray-100" type="button" onClick={() => { setReplyToMsg(msg); setOpenMenuMsgId(null); }}>Reply</button>
                              <button className="px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-500" type="button" onClick={() => { deleteMessage(msg.id); setOpenMenuMsgId(null); }}>Delete</button>
                              <button className="px-4 py-2 text-left text-sm hover:bg-red-100 text-red-600 font-semibold" type="button">Block</button>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Mobile: show options on long press */}
                      {mobileMenuMsgId === msg.id && (
                        <div className="md:hidden absolute z-50 bg-white border border-gray-200 rounded shadow-md py-1 w-32 flex flex-col animate-fadeIn"
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'fadeInLeft 0.2s' }}
                        >
                          <button className="px-4 py-2 text-left text-sm hover:bg-gray-100" type="button" onClick={() => { setReplyToMsg(msg); setMobileMenuMsgId(null); }}>Reply</button>
                          <button className="px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-500" type="button" onClick={() => { deleteMessage(msg.id); setMobileMenuMsgId(null); }}>Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Input - always at bottom, never scrolls */}
            <div className="flex-none border-t border-gray-100 p-4 bg-white relative z-10">
              {/* Reply mention UI */}
              {replyToMsg && (
                <div className="flex items-center mb-2 px-3 py-1 rounded-lg bg-purple-50 border-l-4 border-purple-400">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-purple-700 font-semibold">Replying to:</span>
                    <span className="block text-xs text-gray-700 truncate max-w-xs">{replyToMsg.message}</span>
                  </div>
                  <button className="ml-2 p-1 rounded-full hover:bg-purple-100" onClick={() => setReplyToMsg(null)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              
              {/* File Preview Area */}
              {selectedFile && (
                <div className="mb-3 relative">
                  <div className="relative inline-block">
                    {selectedFile.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border-2 border-purple-200 shadow-sm"
                      />
                    ) : selectedFile.type.startsWith('video/') ? (
                      <video
                        src={URL.createObjectURL(selectedFile)}
                        className="w-20 h-20 object-cover rounded-lg border-2 border-purple-200 shadow-sm"
                        muted
                      />
                    ) : (
                      <div className="w-20 h-20 bg-purple-100 rounded-lg border-2 border-purple-200 shadow-sm flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Remove button overlay */}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        console.log("📁 File selection cleared");
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 relative">
                <button
                  className="p-1.5 hover:bg-gray-100 rounded-full relative"
                  onClick={() => {
                    console.log("📎 Attachment button clicked! Current showAttachmentBar:", showAttachmentBar);
                    setShowAttachmentBar((prev) => !prev);
                  }}
                  type="button"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  ) : (
                    <PaperClipIcon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                {showAttachmentBar && (
                  <div className="absolute left-0 bottom-full mb-2 z-50 flex flex-col bg-white rounded-lg shadow-lg p-2">
                    <button
                      className="group p-1 rounded-xl bg-gradient-to-br from-white/80 to-purple-50 flex flex-col items-center gap-0.5 hover:bg-purple-100 hover:scale-105"
                      type="button"
                      onClick={() => {
                        if (photoInputRef.current) photoInputRef.current.click();
                      }}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-all duration-150">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 group-hover:text-purple-800 transition-all duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity=".08" />
                          <circle cx="8" cy="9" r="1.5" fill="currentColor" />
                          <path d="M21 19l-5.5-7-4.5 6-3-4L3 19" stroke="currentColor" strokeWidth="1.2" fill="none" />
                        </svg>
                      </span>
                      <span className="text-[9px] font-semibold text-purple-700 group-hover:text-purple-900 tracking-wide transition-all duration-150">Photo</span>
                    </button>
                    <button
                      className="group p-1 rounded-xl bg-gradient-to-br from-white/80 to-purple-50 flex flex-col items-center gap-0.5 hover:bg-purple-100 hover:scale-105 mt-1"
                      type="button"
                      onClick={() => setShowGifPicker(true)}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-all duration-150">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 group-hover:text-purple-800 transition-all duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity=".08" />
                          <polygon points="10,9 16,12 10,15" fill="currentColor" />
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        </svg>
                      </span>
                      <span className="text-[9px] font-semibold text-purple-700 group-hover:text-purple-900 tracking-wide transition-all duration-150">GIF</span>
                    </button>
                  </div>
                )}
                <div className="relative flex-1">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={text}
                        onChange={(q) => { 
                          setText(q.target.value);
                        }}
                        onKeyDown={(e) => {
                          try {
                            if (e.key === 'Enter' && (selectedFile || text.trim())) {
                              e.preventDefault();
                              chat();
                            }
                          } catch (error) {
                            console.error("Error while sending message on Enter key:", error);
                          }
                        }}
                        placeholder={selectedFile ? "Add a caption to your image..." : "Type a message..."}
                        className="w-full border border-gray-200 rounded-full px-3 py-1.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      
                      {/* Emoji Button */}
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 hover:text-purple-500 focus:outline-none"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                      >
                        <BsEmojiSmile />
                      </button>
                      
                      {/* Emoji Picker */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 z-50 bg-white shadow-lg rounded-lg p-2 relative">
                          {/* Close Button */}
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
                    </div>

                    <button className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center" type="button">
                      {/* Modern, stylish mic icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="9" y="5" width="6" height="8" rx="3" fill="white" />
                        <path d="M12 17v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M8 13a4 4 0 008 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="12" cy="9" r="3" fill="white" />
                      </svg>
                    </button>
                    <button 
                      className={`p-2 text-white rounded-full transition-colors duration-200 flex items-center justify-center ${
                        selectedFile 
                          ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`} 
                      type="button"
                      onClick={chat}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : selectedFile ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      ) : (
                        <PaperAirplaneIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {showGifPicker && (
                    <div className="absolute left-0 right-0 top-full z-[99999] mt-2">
                      <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-2xl mx-auto max-w-md w-full min-h-[300px]">
                        <button 
                          onClick={() => setShowGifPicker(false)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
                        >
                          ×
                        </button>
                        <GifSelector onSelect={handleGifSelect} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-white ml-8 mr-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-center animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-0.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No chat selected</h3>
              <p className="mt-1 text-sm text-gray-500">Select a user to start messaging</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden file input for photo selection */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ChatList;




