import { OutreachThread } from '../types';

export const OUTREACH_THREADS: OutreachThread[] = [
  {
    id: '1',
    candidateName: 'Todd Hernly',
    candidateEmail: 'thernly@superiorconstruction.com',
    candidateInitial: 'TH',
    subject: 'Re: Structures Role — I-4 Ultimate Experience',
    lastMessage: 'Hi George, I saw your note. I am currently happy at Superior, but the Manatee bridge project is definitely a flagship. Could we talk on Tuesday?',
    time: '9:14 AM',
    status: 'Replied',
    type: 'email',
    messages: [
      {
        id: 'm1',
        sender: 'George',
        content: "Hi Todd, I've been following your work since the I-4 Ultimate project. We're currently spinning up a flagship structures role in Manatee County that seems perfectly aligned with your expertise at Lane and Superior. Would you be open to a confidential brief?",
        time: 'Yesterday',
        isMe: true
      },
      {
        id: 'm2',
        sender: 'Todd Hernly',
        content: "Hi,\n\nThanks for reaching out. I saw your note. I am currently happy at Superior, but the Manatee bridge project is definitely a flagship. I've heard some chatter about it in the corridor.\n\nCould we talk on Tuesday? I have a window around 4 PM.\n\nBest,\nTodd",
        time: '9:14 AM',
        isMe: false
      }
    ]
  },
  {
    id: '2',
    candidateName: 'Nelson Parada',
    candidateEmail: 'nparada@walshgroup.com',
    candidateInitial: 'NP',
    subject: 'Structures Superintendent — Walsh/Archer Pedigree',
    lastMessage: 'Hi Nelson, I came across your profile and was impressed with your 5-year track record at Walsh/Archer.',
    time: '8:42 AM',
    status: 'Sent',
    type: 'email',
    messages: [
      {
        id: 'm3',
        sender: 'George',
        content: "Hi Nelson, I came across your profile and was impressed with your 5-year track record at Walsh/Archer on FDOT bridge projects. We are looking for a key Structures Superintendent to lead a new $200M bridge build. Given your tenure, I thought the timing might be right for a lead role conversation.",
        time: '8:42 AM',
        isMe: true
      }
    ]
  },
  {
    id: '3',
    candidateName: 'Samuel Todd Jr.',
    candidateEmail: 'stodd@conegraham.com',
    candidateInitial: 'ST',
    subject: 'Re: General Superintendent — Road & Bridge',
    lastMessage: 'Appreciate the note. I\'m actually very loyal to Cone & Graham and not looking for a move right now.',
    time: 'Yesterday',
    status: 'Not Interested',
    type: 'email',
    messages: [
      {
        id: 'm4',
        sender: 'George',
        content: "Hi Samuel, noticed your long-standing role at Cone & Graham. Congrats on the recent milestones. We have a unique GS opening that leverages deep FDOT bridge experience.",
        time: '2 days ago',
        isMe: true
      },
      {
        id: 'm5',
        sender: 'Samuel Todd Jr.',
        content: 'Appreciate the note. I\'m actually very loyal to Cone & Graham and not looking for a move right now. We have a great crew here. Let\'s stay in touch though.',
        time: 'Yesterday',
        isMe: false
      }
    ]
  },
  {
    id: '4',
    candidateName: 'Idael Reyes',
    candidateEmail: 'ireyes@middlesexco.com',
    candidateInitial: 'IR',
    subject: 'Structures Role — Tampa Bay Corridor',
    lastMessage: 'Hi Idael, I wanted to reach out regarding a structures position in your backyard.',
    time: 'Yesterday',
    status: 'Sent',
    type: 'email',
    messages: []
  },
  {
    id: '5',
    candidateName: 'Jack Lopez',
    candidateEmail: 'jlopez@middlesexco.com',
    candidateInitial: 'JL',
    subject: 'Re: 30 Years of Structures — A New Flagship Bridge',
    lastMessage: 'This sounds like it could be interesting. What is the contract duration?',
    time: 'Mon',
    status: 'Interested',
    type: 'email',
    messages: [
      {
        id: 'm6',
        sender: 'George',
        content: "Hi Jack, your 30-year track record at Middlesex is legendary in FL structures. We're looking for a veteran like you to lead a high-profile bridge project in Manatee County. The complexity of the subaqueous work seems right up your alley.",
        time: 'Last Friday',
        isMe: true
      },
      {
        id: 'm7',
        sender: 'Jack Lopez',
        content: 'This sounds like it could be interesting. What is the contract duration? I\'ve seen some of the prelims for that Manatee site. I\'d like to see the specific scope.',
        time: 'Mon',
        isMe: false
      }
    ]
  },
  {
    id: '6',
    candidateName: 'Jerrod Schrock',
    candidateInitial: 'JS',
    candidateEmail: 'jschrock@walshgroup.com',
    subject: 'Structures Opportunity — Clearwater to Manatee',
    lastMessage: '[Draft] Hi Jerrod, noticed your work on the Pinellas Gateway job...',
    time: 'Mon',
    status: 'Draft',
    type: 'email',
    messages: []
  }
];
