 const voiceBtn = document.getElementById('voiceTxBtn');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener("click", () => {
      recognition.start();
      voiceBtn.textContent = "🎙..";
    });

    recognition.addEventListener("end", () => {
      voiceBtn.textContent = "🎤.";
    });

    recognition.addEventListener("result", (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Voice Input:", transcript);
      // Simple parsing
      let type = transcript.includes("income")?"in":"out";
       let cleaned = transcript.replace(/,/g,'');
     let amount = Number(cleaned.match(/\d+(\.\d+)?/)?.[0]) || wordsToNumber(transcript) || 0;


      let category = state.dropdowns.categories.find(c => transcript.includes(c.toLowerCase())) || "Food";
      let accounts = state.dropdowns.accounts.find(b => transcript.includes(b.toLowerCase())) || "Cash";
       
      document.getElementById('fabAddTx').click();  // Open Add Tx Modal
      document.getElementById('tx_type').value = type;
      document.getElementById('tx_amount').value = amount;
      document.getElementById('tx_category').value = category;
      document.getElementById('tx_note').value = transcript;
     // document.getElementById('tx_date').value = nowISO();
      document.getElementById('tx_account').value = accounts;
     // document.getElementById('tx_recurrence').value = ReOccurrences;
      showToast(`🎤 Detected: ${type} ₹${amount} for ${category}`, 'info');
    });
  }
  else {
  showToast("Voice input not supported in this browser.", 'info');
}
function wordsToNumber(text) {
  const smallNums = {
    zero:0, one:1, two:2, three:3, four:4, five:5,
    six:6, seven:7, eight:8, nine:9, ten:10,
    eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15,
    sixteen:16, seventeen:17, eighteen:18, nineteen:19,
    twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90
  };
  
  const multipliers = {
    hundred:100,
    thousand:1000
  };

  let words = text.toLowerCase().replace(/-/g,' ').split(/\s+/);
  let total = 0;
  let current = 0;

  for (let w of words) {
    if (smallNums[w] != null) {
      current += smallNums[w];
    } else if (multipliers[w] != null) {
      if (current === 0) current = 1; // e.g., "hundred" = 100
      current *= multipliers[w];
    } else if (w === "and") {
      continue; // ignore "and"
    } else {
      total += current;
      current = 0;
    }
  }

  total += current;
  return total || null;
}
