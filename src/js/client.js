window.addEventListener('DOMContentLoaded', function() {
  const fechaDiv = document.getElementById('date');
  function actualizarFechaHora() {
    const ahora = new Date();
    const fechaHora = ahora.toLocaleDateString() + ' ' +
      ahora.toLocaleTimeString();
    fechaDiv.textContent = fechaHora;
  }
  actualizarFechaHora();
  setInterval(() => {
    actualizarFechaHora();
  }, 100);
});
