
export interface WhatsAppMessage {
  id: string;
  date: string;
  time: string;
  sender: string;
  content: string;
  type: 'text' | 'audio' | 'video' | 'image' | 'document' | 'link' | 'system';
  mediaUrl?: string;
  fileName?: string;
}

export interface DayContent {
  day: number;
  date: string;
  items: WhatsAppMessage[];
}

export function parseWhatsAppChat(text: string): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];
  const lines = text.split('\n');
  const seenKeys = new Set<string>();

  // Format: [19/02/2026, 1:52 pm] User: Message
  const dateRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm)?)\]?\s-?\s?(.*?):\s?(.*)$/i;

  let currentMessage: WhatsAppMessage | null = null;
  const timestamp = Date.now();
  let msgCounter = 0;

  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      if (currentMessage && currentMessage.type !== 'system') {
        messages.push(currentMessage);
      }

      const [_, date, time, sender, rawContent] = match;
      let content = rawContent.trim();
      const msgId = `msg-${timestamp}-${msgCounter++}`;

      // Filter out unwanted system messages
      const lowerContent = content.toLowerCase();
      if (
        lowerContent.includes('joined using a group link') ||
        lowerContent.includes('added') ||
        lowerContent.includes('removed') ||
        lowerContent.includes('left') ||
        lowerContent.includes('changed the subject') ||
        lowerContent.includes('changed the icon') ||
        lowerContent.includes('security code changed') ||
        lowerContent.includes('messages and calls are end-to-end encrypted') ||
        content.includes('You are now an admin')
      ) {
        currentMessage = {
          id: `sys-${timestamp}-${msgCounter++}`,
          date,
          time,
          sender: 'System',
          content,
          type: 'system'
        };
        continue;
      }

      let type: WhatsAppMessage['type'] = 'text';
      let fileName: string | undefined;

      // Check for attached media: <attached: filename.opus>
      const attachedMatch = content.match(/<attached:\s?(.*?)>/i);
      if (attachedMatch) {
        fileName = attachedMatch[1].trim();
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['opus', 'mp3', 'm4a', 'wav'].includes(ext || '')) type = 'audio';
        else if (['mp4', 'mov', 'avi'].includes(ext || '')) type = 'video';
        else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) type = 'image';
        else if (['pdf', 'docx', 'doc', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext || '')) type = 'document';
        // Hide redundant text if it's just the file name
        content = ''; 
    } else {
        const lower = content.toLowerCase();
        // Permissive filename regex for WhatsApp (supports spaces, parens, hyphens, dots)
        const fileRegex = /([\w\s().-]+\.(?:opus|mp3|m4a|mp4|jpg|jpeg|png|webp|gif|pdf|docx|doc|xls|xlsx|ppt|pptx|txt|apk))/i;
        const urlMatch = content.match(/https?:\/\/[^\s]+/i);
        
        if (urlMatch && content.trim() === urlMatch[0]) {
          type = 'link';
        } else if (lower.includes('.opus') || lower.includes('.mp3') || lower.includes('.m4a') || 
                   lower.includes('.wav') || lower.includes('.ogg')) {
          type = 'audio';
          fileName = content.match(fileRegex)?.[0];
          if (content.includes('(file attached)')) content = '';
        } else if (lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.avi')) {
          type = 'video';
          fileName = content.match(fileRegex)?.[0];
          if (content.includes('(file attached)')) content = '';
        } else if (lower.includes('.jpg') || lower.includes('.png') || lower.includes('.jpeg') || 
                   lower.includes('.webp') || lower.includes('.gif')) {
          type = 'image';
          fileName = content.match(fileRegex)?.[0];
          if (content.includes('(file attached)')) content = '';
        } else if (lower.includes('.pdf') || lower.includes('.docx') || lower.includes('.doc') || 
                   lower.includes('.xls') || lower.includes('.xlsx') || lower.includes('.ppt') || 
                   lower.includes('.pptx') || lower.includes('.txt')) {
          type = 'document';
          fileName = content.match(fileRegex)?.[0];
          if (content.includes('(file attached)')) content = '';
        }
      }

      // Unique key for deduplication (preventing duplicate renders of same export)
      // For media, the file name makes it unique. For text, date+time+content.
      const uniqueKey = `${date}-${time}-${content}-${fileName || ''}`;
      if (seenKeys.has(uniqueKey)) {
        currentMessage = null;
        continue;
      }
      seenKeys.add(uniqueKey);

      currentMessage = {
        id: msgId,
        date,
        time,
        sender: sender.trim(),
        content: content.trim(),
        type,
        fileName,
        mediaUrl: fileName ? `/media/${fileName}` : undefined
      };
    } else if (currentMessage && line.trim() && currentMessage.type !== 'system') {
      currentMessage.content += '\n' + line;
    }
  }

  if (currentMessage && currentMessage.type !== 'system') {
    messages.push(currentMessage);
  }
  return messages;
}

export function groupMessagesByDay(messages: WhatsAppMessage[]): DayContent[] {
  const daysMap = new Map<number, { date: string, items: WhatsAppMessage[] }>();
  let currentDay = 1;

  // First pass: identify day boundaries
  messages.forEach(msg => {
    const dayMatch = msg.content.match(/\*Day\s?(\d+)\*/i) || msg.content.match(/Day\s?(\d+)/i);
    if (dayMatch && dayMatch[1]) {
      currentDay = parseInt(dayMatch[1]);
    }
    
    if (!daysMap.has(currentDay)) {
      daysMap.set(currentDay, { date: msg.date, items: [] });
    }
    daysMap.get(currentDay)!.items.push(msg);
  });

  // Second pass: If no "Day X" labels were found at all, fallback to date-based grouping
  if (daysMap.size <= 1 && messages.length > 5) {
     const dateMap = new Map<string, WhatsAppMessage[]>();
     messages.forEach(msg => {
       if (!dateMap.has(msg.date)) dateMap.set(msg.date, []);
       dateMap.get(msg.date)!.push(msg);
     });
     
     const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
       const [da, ma, ya] = a.split('/').map(Number);
       const [db, mb, yb] = b.split('/').map(Number);
       const yearA = ya < 100 ? 2000 + ya : ya;
       const yearB = yb < 100 ? 2000 + yb : yb;
       return new Date(yearA, ma - 1, da).getTime() - new Date(yearB, mb - 1, db).getTime();
     });

     return sortedDates.map((date, index) => ({
       day: index + 1,
       date,
       items: dateMap.get(date)!
     }));
  }

  // Function to get minutes from time string (supports 12h/24h)
  const getMinutes = (timeStr: string) => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s?(am|pm|AM|PM)?/i);
    if (!match) return 0;
    let [_, h, m, ampm] = match;
    let hours = parseInt(h);
    let minutes = parseInt(m);
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
      if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  };

  // Final assembly from labeled groups
  const result: DayContent[] = Array.from(daysMap.entries())
    .map(([day, data]) => ({
      day,
      date: data.date,
      items: data.items.sort((a, b) => {
        // First sort by date if multiple dates are in one day
        if (a.date !== b.date) {
          const [da, ma, ya] = a.date.split('/').map(Number);
          const [db, mb, yb] = b.date.split('/').map(Number);
          const yearA = ya < 100 ? 2000 + ya : ya;
          const yearB = yb < 100 ? 2000 + yb : yb;
          return new Date(yearA, ma - 1, da).getTime() - new Date(yearB, mb - 1, db).getTime();
        }
        // Then sort by time
        return getMinutes(a.time) - getMinutes(b.time);
      })
    }))
    .sort((a, b) => a.day - b.day);

  return result;
}
