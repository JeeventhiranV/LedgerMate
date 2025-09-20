 const voiceBtn = document.getElementById('voiceTxBtn');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener("click", () => {
      recognition.start();
      voiceBtn.textContent = "🎙 Listening...";
    });

    recognition.addEventListener("end", () => {
      voiceBtn.textContent = "🎤 Speak";
    });

    recognition.addEventListener("result", (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Voice Input:", transcript);
      // Simple parsing
      let type = transcript.includes("income")?"in":"out";
      let amount = Number(transcript.match(/\d+(\.\d+)?/)?.[0]||0);
      let category = state.dropdowns.categories.find(c => transcript.includes(c.toLowerCase())) || "Misc";
      let accounts = state.dropdowns.accounts.find(b => transcript.includes(b.toLowerCase())) || "Cash";
      let ReOccurrences = state.dropdowns.recurrences.find(r => transcript.includes(r.toLowerCase())) || "None";
      if(ReOccurrences===""){
        ReOccurrences="None";
      }
      document.getElementById('fabAddTx').click();  // Open Add Tx Modal
      document.getElementById('tx_type').value = type;
      document.getElementById('tx_amount').value = amount;
      document.getElementById('tx_category').value = category;
      document.getElementById('tx_note').value = transcript;
      document.getElementById('tx_date').value = nowISO();
      document.getElementById('tx_account').value = accounts;
      document.getElementById('tx_recurrence').value = ReOccurrences;
      showToast(`🎤 Detected: ${type} ₹${amount} for ${category}`, 'info');
    });
  }
  else {
  showToast("Voice input not supported in this browser.", 'info');
}
