/**
 * Config do projeto Firebase usado só para presença (quem está revisando o quê).
 * Sem SDK — o resto do código fala direto com a REST API do Realtime Database
 * via fetch(), então só a databaseURL é necessária.
 */
const AluraFirebaseConfig = {
  databaseURL: "https://sugestoes-8bdff-default-rtdb.firebaseio.com",
};
