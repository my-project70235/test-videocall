
import { gql } from "@apollo/client";

export const CREATE_POST = gql`
  mutation($id: ID!,$caption: String!, $image: Upload, $video: Upload, $thumbnail: Upload) {
    createPost(id: $id,caption: $caption, image: $image, video: $video, thumbnail: $thumbnail) {
      id
      caption
      imageUrl
      videoUrl
      thumbnailUrl
      isVideo
      createdAt
    }
  }
`;


export const GET_ALL_POSTS = gql`
  query getAllPosts($userId: ID!) {
    getAllPosts(userId: $userId) {
      id
      caption
      imageUrl
      videoUrl
      thumbnailUrl
      isVideo
      createdBy {
        id
        name
        username
        profileImage
      }
      createdAt
      likes {
        user {
          id
        }
        likedAt
      }
      comments {
        id
        text
        user {
          id
          name
        }
        commentedAt
      }
    }
  }
`;



export const GET_ME = gql`
  query {
    getMe {
      id
      name
      username
      bio
      profileImage
      followers { id }
      following { id }
      posts { id }
    }
  }
`;


export const EDIT_PROFILE = gql`
 mutation editProfile(
  $id: ID!,
  $name: String,
  $username: String,
  $caption: String,
  $image: Upload
) {
  editProfile(
    id: $id,
    name: $name,
    username: $username,
    caption: $caption,
    image: $image
  ) {
    id
    name
    username
    email
    profileImage
    bio
  }
}

`;
export const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $username: String!, $email: String!, $password: String!, $phone: String) {
    register(name: $name, username: $username, email: $email, password: $password, phone: $phone) {
      id
      name
      username
      email
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      id
      name
      email
    }
  }
`;


export const LOGOUT_MUTATION = gql`
  mutation {
    logout
  }
`;

export const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      name
      profileImage
      isOnline
      lastActive
    }
  }
`;

export const SEARCH_USER = gql`
  query SearchUser($name: String!) {
    searchUser(name: $name) {
      id
      name
      profileImage
      bio 
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($searchTerm: String!) {
    searchUsers(username: $searchTerm) {
      id
      name
      username
      email
      phone
      profileImage
      bio
      createTime
      followers {
        id
        name
      }
      following {
        id
        name
      }
      posts {
        id
        caption
        imageUrl
        createdAt
      }
    }
  }
`;


export const GET_USER_INFO = gql`
  query getUserInformation($id: ID!) {
    getUserInformation(id: $id) {
      id
      name
      username
      bio
      profileImage
      followers {
        id
      }
      following {
        id
      }
      posts {
        id
      }
    }
  }
`;

export const FOLLOW_AND_UNFOLLOW = gql`
  mutation FollowAndUnfollow($id: ID!) {
    followAndUnfollow(id: $id) {
      id
      name
      username
      profileImage
      followers {
        id
        name
      }
      following {
        id
        name
      }
    }
  }
`;

export const SUGGESTED_USERS = gql`
  query GetSuggestions($userId: ID!) {
    suggestedUsers(userId: $userId) {
      id
      name
      username
      email
      phone
      profileImage
      bio
      createTime
      suggestionScore
    }
  }
`;

export const LIKE_POST = gql`
  mutation LikePost($userId: ID!, $postId: ID!) {
    LikePost(userId: $userId, postId: $postId)
  }
`;

export const COMMENT_POST = gql`
  mutation CommentPost($userId: ID!, $postId: ID!, $text: String!) {
    CommentPost(userId: $userId, postId: $postId, text: $text) {
      text
      commentedAt
      user {
        name
        username
        profileImage
      }
    }
  }
`;

// Video Upload Mutations
export const UPLOAD_VIDEO = gql`
  mutation UploadVideo(
    $title: String!
    $description: String
    $video: Upload!
    $thumbnail: Upload
    $tags: [String]
    $category: String
    $isPublic: Boolean
    $resolution: VideoResolutionInput
  ) {
    uploadVideo(
      title: $title
      description: $description
      video: $video
      thumbnail: $thumbnail
      tags: $tags
      category: $category
      isPublic: $isPublic
      resolution: $resolution
    ) {
      id
      title
      description
      videoUrl
      thumbnailUrl
      duration
      views
      createdBy {
        id
        name
        username
        profileImage
      }
      createdAt
      updatedAt
      likes {
        user {
          id
        }
        likedAt
      }
      comments {
        id
        text
        user {
          id
          name
          username
        }
        commentedAt
      }
      tags
      category
      isPublic
      fileSize
      resolution {
        width
        height
      }
    }
  }
`;

export const GET_ALL_VIDEOS = gql`
  query GetAllVideos {
    getAllVideos {
      id
      title
      description
      videoUrl
      thumbnailUrl
      duration
      views
      createdBy {
        id
        name
        username
        profileImage
      }
      createdAt
      updatedAt
      likes {
        user {
          id
        }
        likedAt
      }
      comments {
        id
        text
        user {
          id
          name
          username
        }
        commentedAt
      }
      tags
      category
      isPublic
      fileSize
      resolution {
        width
        height
      }
    }
  }
`;

export const GET_USER_VIDEOS = gql`
  query GetUserVideos($userId: ID!) {
    getUserVideos(userId: $userId) {
      id
      title
      description
      videoUrl
      thumbnailUrl
      duration
      views
      createdBy {
        id
        name
        username
        profileImage
      }
      createdAt
      updatedAt
      likes {
        user {
          id
        }
        likedAt
      }
      comments {
        id
        text
        user {
          id
          name
          username
        }
        commentedAt
      }
      tags
      category
      isPublic
      fileSize
      resolution {
        width
        height
      }
    }
  }
`;

export const LIKE_VIDEO = gql`
  mutation LikeVideo($videoId: ID!) {
    likeVideo(videoId: $videoId)
  }
`;

export const COMMENT_ON_VIDEO = gql`
  mutation CommentOnVideo($videoId: ID!, $text: String!) {
    commentOnVideo(videoId: $videoId, text: $text) {
      id
      text
      user {
        id
        name
        username
        profileImage
      }
      commentedAt
    }
  }
`;

export const INCREMENT_VIDEO_VIEWS = gql`
  mutation IncrementVideoViews($videoId: ID!) {
    incrementVideoViews(videoId: $videoId) {
      id
      views
    }
  }
`;

export const TRACK_VIDEO_VIEW = gql`
  mutation TrackVideoView($videoId: ID!) {
    trackVideoView(videoId: $videoId) {
      id
      views
    }
  }
`;

// Group Chat Mutations and Queries
export const CREATE_GROUP = gql`
  mutation CreateGroup($input: CreateGroupInput!) {
    createGroup(input: $input) {
      _id
      name
      description
      groupImage
      members {
        id
        name
        username
        profileImage
      }
      admins {
        id
        name
        username
        profileImage
      }
      createdBy {
        id
        name
        username
        profileImage
      }
      isPrivate
      maxMembers
      memberCount
      createdAt
    }
  }
`;

export const GET_USER_GROUPS = gql`
  query GetUserGroups($userId: ID!) {
    getUserGroups(userId: $userId) {
      _id
      name
      description
      groupImage
      members {
        id
        name
        username
        profileImage
        isOnline
      }
      lastMessage {
        content
        sender {
          name
          username
        }
        timestamp
      }
      memberCount
      updatedAt
    }
  }
`;

export const SEND_GROUP_MESSAGE = gql`
  mutation SendGroupMessage(
    $groupId: ID!
    $content: String
    $messageType: String
    $media: MediaInput
    $replyTo: ID
  ) {
    sendGroupMessage(
      groupId: $groupId
      content: $content
      messageType: $messageType
      media: $media
      replyTo: $replyTo
    ) {
      _id
      content
      messageType
      sender {
        id
        name
        username
        profileImage
      }
      media {
        url
        type
        filename
      }
      replyTo {
        _id
        content
        sender {
          name
        }
      }
      createdAt
    }
  }
`;

export const SEND_GROUP_MESSAGE_WITH_FILE = gql`
  mutation SendGroupMessageWithFile(
    $groupId: ID!
    $content: String
    $file: Upload!
    $replyTo: ID
  ) {
    sendGroupMessageWithFile(
      groupId: $groupId
      content: $content
      file: $file
      replyTo: $replyTo
    ) {
      _id
      content
      messageType
      sender {
        id
        name
        username
        profileImage
      }
      media {
        url
        type
        filename
        size
      }
      replyTo {
        _id
        content
        sender {
          name
        }
      }
      createdAt
    }
  }
`;

export const GET_GROUP_MESSAGES = gql`
  query GetGroupMessages($groupId: ID!, $limit: Int, $offset: Int) {
    getGroupMessages(groupId: $groupId, limit: $limit, offset: $offset) {
      _id
      content
      messageType
      sender {
        id
        name
        username
        profileImage
      }
      media {
        url
        type
        filename
      }
      replyTo {
        _id
        content
        sender {
          name
        }
      }
      createdAt
    }
  }
`;

export const DELETE_GROUP_MESSAGE = gql`
  mutation DeleteGroupMessage($messageId: ID!) {
    deleteGroupMessage(messageId: $messageId) {
      _id
      isDeleted
      deletedAt
    }
  }
`;

export const GET_GROUP_UNREAD_COUNT = gql`
  query GetGroupUnreadCount($groupId: ID!) {
    getGroupUnreadCount(groupId: $groupId)
  }
`;

export const MARK_GROUP_MESSAGE_AS_READ = gql`
  mutation MarkGroupMessageAsRead($messageId: ID!) {
    markGroupMessageAsRead(messageId: $messageId) {
      _id
      readBy {
        user {
          id
          name
        }
        readAt
      }
    }
  }
`;

export const SEARCH_USERS_FOR_GROUP = gql`
  query SearchUsers($query: String!) {
    searchUsers(username: $query) {
      id
      name
      username
      profileImage
    }
  }
`;

// Chat Mutations
export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $senderId: ID!
    $receiverId: ID!
    $message: String
    $media: MediaInput
  ) {
    sendMessage(
      senderId: $senderId
      receiverId: $receiverId
      message: $message
      media: $media
    ) {
      id
      message
      media {
        url
        type
        filename
        size
      }
      sender {
        id
        name
      }
      receiver {
        id
        name
      }
      createdAt
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($senderId: ID!, $receiverId: ID!) {
    getMessages(senderId: $senderId, receiverId: $receiverId) {
      id
      message
      media {
        url
        type
        filename
        size
      }
      sender {
        id
        name
      }
      receiver {
        id
        name
      }
      createdAt
    }
  }
`;

export const SEND_MESSAGE_WITH_FILE = gql`
  mutation SendMessageWithFile(
    $senderId: ID!
    $receiverId: ID!
    $message: String
    $file: Upload!
  ) {
    sendMessageWithFile(
      senderId: $senderId
      receiverId: $receiverId
      message: $message
      file: $file
    ) {
      id
      message
      media {
        url
        type
        filename
        size
      }
      sender {
        id
        name
      }
      receiver {
        id
        name
      }
      createdAt
    }
  }
`;

export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($messageId: ID!) {
    deleteMessage(messageId: $messageId)
  }
`;
