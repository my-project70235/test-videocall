const { GraphQLUpload } = require('graphql-upload');
const chatSchema = require("./chatSchema");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv")
dotenv.config()
const {user_token} = require("../Utils/token")
const { ApolloError } = require("apollo-server-express");
const { uploadToCloudinary } = require('../Utils/cloudinary');


module.exports = {
  Upload: GraphQLUpload,
  Query: {
    joinvideocall: async (_, { roomID },{user}) => {
      console.log(user);
      
      try {
        const appID = process.env.APPIDV;
        const serverSecret = process.env.SERVERIDV;
        console.log(appID,serverSecret);
        
    
        if (!appID || !serverSecret) throw new ApolloError("Missing server credentials");
        if (!roomID) throw new ApolloError("Room ID is required");
    
        const userID = user.id;
        const username = user.username;
    
        // const effectiveTime = 3600; // Token valid for 1 hour
        // let currentTime = Math.floor(Date.now() / 1000);
        // let expireTime = currentTime + effectiveTime;
    
        const payloadObject = {
          room_id: roomID,
          user_id: userID,
          privilege: {
            1: 1, // Login room
            2: 1, // Publish stream
          },
          stream_id_list: null,
        };
    
        const payload = Buffer.from(JSON.stringify(payloadObject)).toString("base64");
        const nonce = crypto.randomBytes(16).toString("hex");
        const inputText = appID + userID + nonce  + payload;
    
        const hash = crypto
          .createHmac("sha256", serverSecret)
          .update(inputText)
          .digest("hex");
    
        const token = `${appID}.${userID}.${nonce}.${hash}.${payload}`;
    
        return {
          token,
          userID,
          username,
          appID,
        serverSecret
        };
    
      } 
      catch (error) {
  console.error("Error generating Zego token:", error);
  throw new ApolloError(error.message || "Failed to generate Zego token", "ZEGO_TOKEN_ERROR", {
    originalError: error,
  });
}

    },
      
   
    getMessages: async (_, { senderId, receiverId }) => {
      try {
        // Step 1: Dono users ke beech jitne bhi messages hain (A -> B ya B -> A)
        // Populate sender and receiver with full user data
        const messages = await chatSchema.find({
          $or: [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId },
          ],
        })
        .populate('sender', 'name profileImage')
        .populate('receiver', 'name profileImage')
        .sort({ createdAt: 1 }); // Step 2: Oldest to newest

        console.log(messages);
        
        // Format messages for GraphQL response
        const formattedMessages = messages.map(msg => ({
          id: msg._id.toString(),
          message: msg.message,
          media: msg.media,
          sender: {
            id: msg.sender._id.toString(),
            name: msg.sender.name,
            profileImage: msg.sender.profileImage
          },
          receiver: {
            id: msg.receiver._id.toString(),
            name: msg.receiver.name,
            profileImage: msg.receiver.profileImage
          },
          createdAt: msg.createdAt.toISOString()
        }));
        
        return formattedMessages;
      } catch (error) {
        console.error("Error fetching messages:", error);
        throw new Error("Failed to fetch messages");
      }
    },
  },

  Mutation: {
    sendMessage: async (_, { senderId, receiverId, message, media }, context) => {
      try {
        console.log('📤 GraphQL sendMessage called with:', {
          senderId,
          receiverId,
          message,
          media
        });
        
        const { io } = context;
        
        // Validate that either message or media is provided
        if (!message && !media) {
          throw new Error("Either message or media must be provided");
        }
        
        // Validate media object if provided
        if (media) {
          console.log('🔍 Validating media object:', media);
          if (!media.url || !media.type || !media.filename) {
            throw new Error("Media object must have url, type, and filename");
          }
        }
        
        // Step 1: Message ko MongoDB me save karo
        console.log('💾 Creating message in database...');
        console.log('📋 Message data to save:', {
          sender: senderId,
          receiver: receiverId,
          message: message,
          media: media
        });
        
        const newMsg = await chatSchema.create({
          sender: senderId,
          receiver: receiverId,
          message: message,
          media: media,
        });
        console.log('✅ Message created in database:', newMsg._id);

        // Step 2: Populate sender and receiver with full user data
        console.log('👥 Populating sender and receiver data...');
        const populatedMsg = await newMsg.populate([
          { path: 'sender', select: 'name profileImage' },
          { path: 'receiver', select: 'name profileImage' }
        ]);
        console.log('✅ Populated message:', {
          id: populatedMsg._id,
          sender: populatedMsg.sender,
          receiver: populatedMsg.receiver,
          media: populatedMsg.media
        });
        
        // Step 3: Format the message for GraphQL response
        const formattedMsg = {
          id: populatedMsg._id.toString(),
          message: populatedMsg.message,
          media: populatedMsg.media,
          sender: {
            id: populatedMsg.sender._id.toString(),
            name: populatedMsg.sender.name,
            profileImage: populatedMsg.sender.profileImage
          },
          receiver: {
            id: populatedMsg.receiver._id.toString(),
            name: populatedMsg.receiver.name,
            profileImage: populatedMsg.receiver.profileImage
          },
          createdAt: populatedMsg.createdAt.toISOString()
        };
        
        console.log('📤 Formatted message for GraphQL response:', formattedMsg);
        
        // Step 4: Real-time socket emit to both sender and receiver
        try {
          if (io) {
            // Ensure IDs are strings for socket rooms
            const receiverIdStr = receiverId.toString();
            const senderIdStr = senderId.toString();
            
            // Emit to receiver
            io.to(receiverIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to receiver:', receiverIdStr);
            
            // Also emit to sender so their temporary message gets replaced
            io.to(senderIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to sender:', senderIdStr);
          }
        } catch (socketError) {
          console.error("Error emitting socket message:", socketError);
          // Continue execution even if socket fails
        }
        
        // Step 5: Message ko GraphQL mutation response me return karo
        console.log('✅ Returning formatted message from GraphQL mutation');
        return formattedMsg;
      } catch (error) {
        console.error("❌ === GRAPHQL SEND MESSAGE ERROR ===");
        console.error("❌ Error type:", error.constructor.name);
        console.error("❌ Error message:", error.message);
        console.error("❌ Full error:", error);
        console.error("❌ Error stack:", error.stack);
        console.error("❌ === GRAPHQL SEND MESSAGE ERROR END ===");
        throw new Error(`Failed to send message: ${error.message}`);
      }
    },
    
    sendMessageWithFile: async (_, { senderId, receiverId, message, file }, context) => {
      try {
        console.log('📤 GraphQL sendMessageWithFile called with:', {
          senderId,
          receiverId,
          message,
          hasFile: !!file
        });
        
        const { io } = context;
        
        // Validate that file is provided
        if (!file) {
          throw new Error("File must be provided for sendMessageWithFile");
        }
        
        // Get file details
        const { filename, mimetype } = await file;
        console.log('📁 File details:', { filename, mimetype });
        
        // Determine file type
        const fileType = mimetype.startsWith('image/') ? 'image' : 
                        mimetype.startsWith('video/') ? 'video' : 'auto';
        
        console.log('🔍 Detected file type:', fileType);
        
        // Upload to Cloudinary using existing utility function
        console.log('📤 Starting Cloudinary upload...');
        const uploadResult = await uploadToCloudinary(file, fileType);
        console.log('✅ File uploaded to Cloudinary:', uploadResult);
        
        // Create media object based on upload result
        let mediaData;
        if (typeof uploadResult === 'string') {
          // For images, uploadToCloudinary returns just the URL
          mediaData = {
            url: uploadResult,
            type: fileType,
            filename: filename,
            size: 0 // Size not available from string response
          };
        } else {
          // For videos, uploadToCloudinary returns an object with metadata
          mediaData = {
            url: uploadResult.url,
            type: fileType,
            filename: filename,
            size: uploadResult.bytes || 0
          };
        }
        
        console.log('📋 Media data prepared:', mediaData);
        
        // Save message to database
        console.log('💾 Creating message in database...');
        const newMsg = await chatSchema.create({
          sender: senderId,
          receiver: receiverId,
          message: message,
          media: mediaData,
        });
        console.log('✅ Message created in database:', newMsg._id);

        // Populate sender and receiver with full user data
        console.log('👥 Populating sender and receiver data...');
        const populatedMsg = await newMsg.populate([
          { path: 'sender', select: 'name profileImage' },
          { path: 'receiver', select: 'name profileImage' }
        ]);
        
        // Format the message for GraphQL response
        const formattedMsg = {
          id: populatedMsg._id.toString(),
          message: populatedMsg.message,
          media: populatedMsg.media,
          sender: {
            id: populatedMsg.sender._id.toString(),
            name: populatedMsg.sender.name,
            profileImage: populatedMsg.sender.profileImage
          },
          receiver: {
            id: populatedMsg.receiver._id.toString(),
            name: populatedMsg.receiver.name,
            profileImage: populatedMsg.receiver.profileImage
          },
          createdAt: populatedMsg.createdAt.toISOString()
        };
        
        console.log('📤 Formatted message for GraphQL response:', formattedMsg);
        
        // Real-time socket emit to both sender and receiver
        try {
          if (io) {
            // Ensure IDs are strings for socket rooms
            const receiverIdStr = receiverId.toString();
            const senderIdStr = senderId.toString();
            
            // Emit to receiver
            io.to(receiverIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to receiver:', receiverIdStr);
            
            // Also emit to sender so their temporary message gets replaced
            io.to(senderIdStr).emit("receiveMessage", formattedMsg);
            console.log('📤 Socket message emitted to sender:', senderIdStr);
          }
        } catch (socketError) {
          console.error("Error emitting socket message:", socketError);
          // Continue execution even if socket fails
        }
        
        // Return formatted message
        console.log('✅ Returning formatted message from GraphQL mutation');
        return formattedMsg;
        
      } catch (error) {
        console.error("❌ === GRAPHQL SEND MESSAGE WITH FILE ERROR ===");
        console.error("❌ Error type:", error.constructor.name);
        console.error("❌ Error message:", error.message);
        console.error("❌ Full error:", error);
        console.error("❌ Error stack:", error.stack);
        console.error("❌ === GRAPHQL SEND MESSAGE WITH FILE ERROR END ===");
        throw new Error(`Failed to send message with file: ${error.message}`);
      }
    },

    deleteMessage: async (_, { messageId }, context) => {
      try {
        const { io } = context;
        
        // Find the message first to get sender and receiver info
        const message = await chatSchema.findById(messageId).populate("sender receiver");
        
        if (!message) {
          throw new Error("Message not found");
        }
        
        // Delete the message from the database
        await chatSchema.findByIdAndDelete(messageId);
        
        // Emit socket event to notify clients about the deleted message
        if (io) {
          try {
            // Format the message ID for socket transmission
            const deleteInfo = {
              messageId: messageId,
              senderId: message.sender._id.toString(),
              receiverId: message.receiver._id.toString()
            };
            
            // Broadcast the delete event to all connected clients
            io.emit("messageDeleted", deleteInfo);
            console.log("Broadcasted message deletion to all clients:", deleteInfo);
          } catch (socketError) {
            console.error("Error emitting socket delete event:", socketError);
          }
        }
        
        return true; // Return success
      } catch (error) {
        console.error("Error deleting message:", error);
        throw new Error("Failed to delete message");
      }
    },
  },
};
