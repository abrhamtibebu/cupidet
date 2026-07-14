export type Interest = { id: number; name: string }

export type Photo = {
  id: number
  image_url: string
  is_primary: boolean
  status: string
}

export type ProfilePrompt = {
  prompt_key: string
  label?: string
  answer: string
}

export type Profile = {
  name: string
  birth_date: string
  gender: string
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  bio?: string | null
  relationship_goal?: string | null
  height_cm?: number | null
  education?: string | null
  occupation?: string | null
  religion?: string | null
  languages?: string[] | null
  children?: string | null
  pets?: string | null
  drinking?: string | null
  smoking?: string | null
  hobbies?: string[] | null
}

export type Preferences = {
  preferred_gender?: string | null
  min_age: number
  max_age: number
  preferred_location?: string | null
  max_distance_km?: number
  preferred_languages?: string[] | null
  preferred_interest_ids?: number[] | null
}

export type User = {
  id: number
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  photo_url?: string | null
  status: string
  verified: boolean
  notify_matches?: boolean
  notify_likes?: boolean
  notify_messages?: boolean
  profile?: Profile | null
  photos?: Photo[]
  interests?: Interest[]
  preferences?: Preferences | null
  prompts?: ProfilePrompt[]
}

export type DiscoverCard = {
  id: number
  name: string
  age?: number | null
  location?: string | null
  bio?: string | null
  gender?: string | null
  relationship_goal?: string | null
  height_cm?: number | null
  education?: string | null
  occupation?: string | null
  religion?: string | null
  languages?: string[]
  children?: string | null
  pets?: string | null
  drinking?: string | null
  smoking?: string | null
  hobbies?: string[]
  prompts?: ProfilePrompt[]
  verified: boolean
  photo_url?: string | null
  photos: { id: number; image_url: string; is_primary: boolean }[]
  interests: string[]
  username?: string | null
  compatibility_score?: number
  distance_km?: number | null
  is_online?: boolean
  last_active?: string | null
  like_type?: string
  you_liked_back?: boolean
}

export type ChatMessage = {
  id: number
  match_id?: number
  body: string
  sender_id: number
  is_mine: boolean
  delivered_at?: string | null
  read_at?: string | null
  created_at: string
  status?: 'sending' | 'sent' | 'delivered' | 'seen' | 'received' | 'failed'
  client_id?: string
}

export type MatchItem = {
  id: number
  matched_at: string
  user: DiscoverCard
  telegram_chat_url?: string | null
  last_message?: {
    id: number
    body: string
    sender_id: number
    created_at: string
    is_mine: boolean
  } | null
  unread_count?: number
}
