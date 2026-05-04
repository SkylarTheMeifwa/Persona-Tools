const demons = [
  { name: "Culebre", eager: ["Taunt (MC)", "Pontificate"] },
  { name: "Cockatrice", eager: ["Bribe", "Ignore", "Lie"] },
  { name: "Nue", eager: ["Bribe", "Ignore", "Lie"] },
  { name: "Ocelot", eager: ["Bribe", "Ignore", "Lie"] },
  { name: "Yomotsu Shikome", eager: ["Abuse", "Lie", "Ignore"] },
  { name: "Cath Paluc", eager: ["Abuse", "Lie", "Ignore"] },
  { name: "Purski", eager: ["Invite", "Taunt"] },
  { name: "Titania", eager: ["Invite"] },
  { name: "Zombie Nurse", eager: ["Sarcasm"] },
  { name: "Picollus", eager: ["Persuade (MC)"] },
  { name: "Kwancha", eager: ["Persuade (MC)"] },
  { name: "Genkurou", eager: ["Dance"] },
  { name: "Selket", eager: ["Stare"] },
  { name: "Anatomy", eager: ["Pontificate", "Abuse", "Plead"] },
  { name: "Virtue", eager: ["Pontificate", "Abuse", "Plead"] },
  { name: "Rakshasa", eager: ["Taunt (MC)", "Persuade (Yukino)"] },
  { name: "Malphas", eager: ["Persuade (MC)", "Taunt (Mark)", "Soothe"] },
  { name: "Tokebi", eager: ["Pontificate", "Stare", "Sing (Elly)", "Pickup"] },
  { name: "Eligor", eager: ["Persuade (MC)", "Stare"] },
  { name: "Ouroboros", eager: ["Persuade (MC)", "Stare"] },
  { name: "Ocypete", eager: ["Taunt (MC, Mark)", "Stare", "Brag", "Chat", "Cringe"] },
  { name: "Celaeno", eager: ["Taunt (MC, Mark)", "Stare", "Brag", "Chat", "Cringe"] },
  { name: "Aello", eager: ["Taunt (MC, Mark)", "Stare", "Brag", "Chat", "Cringe"] },
  { name: "Jack Frost", eager: ["Invite (MC)", "Lie"] },
  { name: "Fuji Musume", eager: ["Invite (MC)", "Ignore (Reiji)"] },
  { name: "Rusalka", eager: ["Invite (MC)", "Ignore (Reiji)"] },
  { name: "Nekomata", eager: ["Invite (MC)", "Ignore (Reiji)"] },
  { name: "Slime", eager: ["Invite (MC)", "Bribe", "Cry"] },
  { name: "Zombie Girl", eager: ["Threaten", "Ignore (Yukino, Reiji)"] },
  { name: "Mr. Zombie", eager: ["Dance", "Sing (Elly)", "Threaten", "Ignore"] },
  { name: "Zombie Boy", eager: ["Dance", "Sing (Elly)", "Threaten", "Ignore"] },
  { name: "Ghost", eager: ["Dance", "Sing (Elly)", "Threaten", "Ignore"] },
  { name: "Agathion", eager: ["Dance", "Sing (Elly)", "Threaten", "Ignore"] },

  { name: "Nacht Kobold", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Hoodlum", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Afanc", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Ogre", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Phunbaba", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Zap", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Mizuchi", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Mushus", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },
  { name: "Hecatoncheires", eager: ["Bribe", "Condescend", "Sarcasm", "Invite (Elly)", "Startle", "Threaten (Reiji)"] },

  { name: "Cu Sith", eager: ["Persuade (MC)", "Invite (MC)", "Startle"] },
  { name: "Nisroc", eager: ["Persuade (MC)", "Invite (MC)", "Startle"] },
  { name: "Teketeke", eager: ["Persuade (MC)", "Invite (MC)", "Startle"] },
  { name: "Yaksini", eager: ["Persuade (MC)", "Invite (MC)", "Chat", "Startle"] },
  { name: "Dakini", eager: ["Persuade (MC)", "Invite (MC)", "Chat", "Startle"] },

  { name: "Knocker", eager: ["Sing (Elly)", "Brag"] },
  { name: "Pixie", eager: ["Brag", "Condescend", "Abuse", "Plead"] },
  { name: "Succubus", eager: ["Brag", "Condescend", "Abuse", "Plead"] },

  { name: "Gandharva", eager: ["Persuade (MC)", "Invite (Elly)", "Taunt (Mark)", "Stare", "Brag", "Abuse"] },
  { name: "Cupid", eager: ["Persuade (MC)", "Invite (Elly)", "Taunt (Mark)", "Stare", "Brag", "Abuse"] },

  { name: "Otohime", eager: ["Taunt (Mark)", "Stare"] },
  { name: "Paimon", eager: ["Taunt (Mark)", "Stare"] },

  { name: "Yato no Kami", eager: ["Persuade (MC)", "Taunt (MC)", "Stare", "Joke", "Cry", "Threaten (Ayase, Reiji)", "Cringe"] },
  { name: "Haokah", eager: ["Persuade (MC)", "Taunt (MC)", "Stare", "Joke", "Cry", "Threaten (Ayase, Reiji)", "Cringe"] },
  { name: "Incubus", eager: ["Persuade (MC)", "Taunt (MC)", "Stare", "Joke", "Cry", "Threaten (Ayase, Reiji)", "Cringe"] },

  { name: "Megaera", eager: ["Cringe", "Threaten (Ayase, Reiji)"] },
  { name: "Tisiphone", eager: ["Cringe", "Threaten (Ayase, Reiji)"] },
  { name: "Alecto", eager: ["Cringe", "Threaten (Ayase, Reiji)"] },
  { name: "Tlazolteotl", eager: ["Cringe", "Threaten (Ayase, Reiji)"] },

  { name: "Preta", eager: ["Dance", "Sarcasm", "Cry"] },
  { name: "Ihika", eager: ["Dance", "Sarcasm", "Cry"] },
  { name: "Ba", eager: ["Dance", "Sarcasm", "Cry"] },
  { name: "Leprechaun", eager: ["Dance", "Sarcasm", "Cry"] },
  { name: "Yaka", eager: ["Dance", "Sarcasm", "Cry"] },
  { name: "Vetala", eager: ["Dance", "Sarcasm", "Cry"] },

  { name: "Quicksilver", eager: ["Sarcasm", "Prestidigitate"] },
  { name: "Moh Shuvuu", eager: ["Sarcasm", "Prestidigitate"] },
  { name: "Iwate", eager: ["Sarcasm", "Prestidigitate"] },
  { name: "Scylla", eager: ["Sarcasm", "Prestidigitate"] },

  { name: "Kokkuri", eager: ["Condescend", "Sarcasm", "Brag", "Invite (Elly)", "Cry"] },
  { name: "Alastor", eager: ["Condescend", "Sarcasm", "Brag", "Invite (Elly)", "Cry"] },
  { name: "Hresvelgr", eager: ["Condescend", "Sarcasm", "Brag", "Invite (Elly)", "Cry"] },

  { name: "Hannya", eager: ["Sarcasm", "Sing (Elly)"] },
  { name: "Arachne", eager: ["Sarcasm", "Sing (Elly)"] },

  { name: "Zombie Painter", eager: ["Taunt (MC)", "Stare"] },
  { name: "Hi no Enma", eager: ["Taunt (MC)", "Sarcasm", "Stare"] },
  { name: "Sumizome", eager: ["Taunt (MC)", "Sarcasm", "Stare"] },

  { name: "Zombie Cop", eager: ["Persuade (MC)", "Plead"] },
  { name: "Power", eager: ["Persuade (MC)", "Plead"] },
  { name: "Gdon", eager: ["Persuade (MC)", "Plead"] },

  { name: "Lilim", eager: ["Plead", "Cringe"] },

  { name: "Yakuza", eager: ["Invite (MC)", "Stare", "Threaten (Ayase)"] },
  { name: "Dribbler", eager: ["Invite (MC)", "Stare", "Threaten (Ayase)"] },
  { name: "Archangel", eager: ["Invite (MC)", "Stare", "Threaten (Ayase)"] },
  { name: "Yaksa", eager: ["Invite (MC)", "Stare", "Threaten (Ayase)"] },
  { name: "Rukh", eager: ["Invite (MC)", "Stare", "Threaten (Ayase)"] },

  { name: "Salome", eager: ["Stare", "Seduce", "Threaten (Ayase)"] },

  { name: "Toufei", eager: ["Sarcasm", "Dance", "Plead"] },

  { name: "Polisun", eager: ["Persuade (MC)", "Brag"] },
  { name: "Jinn", eager: ["Persuade (MC)", "Brag"] },
  { name: "Barbatos", eager: ["Persuade (MC)", "Brag"] },

  { name: "Berith", eager: ["Condescend", "Sarcasm"] },
  { name: "Fafnir", eager: ["Condescend", "Sarcasm"] },

  { name: "Dark Elf", eager: ["Sarcasm", "Chat", "Persuade (Yukino)"] },

  { name: "Black Widow", eager: ["Stare"] },
  { name: "Druj", eager: ["Stare"] },

  { name: "Principality", eager: ["Persuade (MC)", "Stare", "Soothe", "Threaten (Reiji)"] },
  { name: "Naga", eager: ["Persuade (MC)", "Stare", "Soothe", "Threaten (Reiji)"] },
  { name: "Dominion", eager: ["Persuade (MC)", "Stare", "Soothe", "Threaten (Reiji)"] },
  { name: "Xiuhtecuhtli", eager: ["Persuade (MC)", "Stare", "Soothe", "Threaten (Reiji)"] },

  { name: "Sarashina-hime", eager: ["Stare", "Threaten (Reiji, Ayase)"] },
  { name: "Rangda", eager: ["Stare", "Threaten (Reiji, Ayase)"] },
  { name: "Throne", eager: ["Stare", "Threaten (Reiji, Ayase)"] },

  { name: "Girimehkala", eager: ["Condescend"] },

  { name: "Pairika", eager: ["Plead", "Chat", "Sing (Elly)", "Persuade (Yukino)"] },

  { name: "Pyro Jack", eager: ["Invite (MC)", "Lie"] },

  { name: "Ukobach", eager: ["Sing (Elly)", "Cry", "Lie", "Threaten (Reiji)"] },
  { name: "Angel", eager: ["Sing (Elly)", "Cry", "Lie", "Threaten (Reiji)"] },

  { name: "Hanako", eager: ["Startle", "Ignore (Reiji)"] },

  { name: "Nightmare", eager: ["Cry", "Ignore (Yukino)", "Lie", "Threaten (Reiji)"] },
  { name: "Enku", eager: ["Cry", "Ignore (Yukino)", "Lie", "Threaten (Reiji)"] },
  { name: "Catoblepas", eager: ["Cry", "Ignore (Yukino)", "Lie", "Threaten (Reiji)"] },

  { name: "Bukimi", eager: ["Sarcasm", "Ignore (Reiji)"] },

  { name: "Poltergeist", eager: ["Bribe", "Condescend", "Invite (Elly)"] },
  { name: "Nozuchi", eager: ["Bribe", "Condescend", "Invite (Elly)"] },

  { name: "Orthrus", eager: ["Taunt (MC)", "Pickup", "Invite (Elly)", "Abuse"] },
  { name: "Ubelluris", eager: ["Taunt (MC)", "Pickup", "Invite (Elly)", "Abuse"] },

  { name: "Siren", eager: ["Stare", "Brag", "Seduce"] },

  { name: "Kobold", eager: ["Sarcasm", "Stare", "Abuse", "Cry"] },

  { name: "Carrie", eager: ["Sarcasm", "Dance", "Invite (Elly)"] },

  { name: "Cromm Cruach", eager: ["Plead"] },
  { name: "Fenrir", eager: ["Plead"] },

  { name: "Cait Sith", eager: ["Sarcasm", "Stare", "Brag", "Invite (Elly)", "Ignore (Reiji)", "Threaten (Reiji)"] },
  { name: "Oberon", eager: ["Sarcasm", "Stare", "Brag", "Invite (Elly)", "Ignore (Reiji)", "Threaten (Reiji)"] },
  { name: "Ganesha", eager: ["Sarcasm", "Stare", "Brag", "Invite (Elly)", "Ignore (Reiji)", "Threaten (Reiji)"] },

  { name: "Gremlin", eager: ["Plead"] },

  { name: "Shadow", eager: ["Stare", "Threaten (Ayase)"] },
  { name: "Andramelech", eager: ["Stare", "Threaten (Ayase)"] },

  { name: "Duergar", eager: ["Bribe", "Sarcasm"] },

  { name: "Doppleganger", eager: ["Condescend", "Chat", "Persuade (Yukino)"] },
  { name: "Kiyohime", eager: ["Condescend", "Chat", "Persuade (Yukino)"] },
  { name: "Miyasudokoro", eager: ["Condescend", "Chat", "Persuade (Yukino)"] },

  { name: "Tengu", eager: ["Soothe", "Plead"] },

  { name: "Wyvern", eager: ["Cry", "Cringe"] },

  { name: "Legion", eager: ["Dance", "Cry"] },

  { name: "Kuchisake-onna", eager: ["N/A"] }
];