

const choices = ['rock', 'paper', 'scissors'];
const playerDisplay = document.getElementById('playerDisplay');
const computerDisplay = document.getElementById('computerDisplay');
const resultDisplay = document.getElementById('resultDisplay');
const playerScoreDisplay = document.getElementById('playerScoreDisplay');
const computerScoreDisplay = document.getElementById('computerScoreDisplay');
let playerScore = 0;
let computerScore = 0;
if (localStorage.getItem("logged") !== "yes") {
    window.location.href = "../index.html";
}


function playGame(playerChoice){
    const computerChoice = choices[Math.floor(Math.random()*3)]
    let result = '';

    if ( playerChoice === computerChoice){
        result = "REMIS"
    }
    else{
        switch(playerChoice){
            case "rock":
                result = (computerChoice === 'scissors') ? 'WYGRAŁEŚ' : 'PRZEGRAŁEŚ';
                break;
            case "paper":
                result = (computerChoice === 'rock') ? 'WYGRAŁEŚ' : 'PRZEGRAŁEŚ';
                break;
            case "scissors":
                result = (computerChoice === 'paper') ? 'WYGRAŁEŚ' : 'PRZEGRAŁEŚ';
                break;
        }
    }
    playerDisplay.textContent = `Gracz: ${playerChoice}`;
    computerDisplay.textContent = `Komputer: ${computerChoice}`;
    resultDisplay.textContent = result
    resultDisplay.classList.remove('greenText','redText');
    switch(result){
        case 'WYGRAŁEŚ':
            resultDisplay.classList.add('greenText');
            playerScore ++;
            playerScoreDisplay.textContent = playerScore;

            break;
        case 'PRZEGRAŁEŚ':
            resultDisplay.classList.add('redText');
            computerScore ++;
            computerScoreDisplay.textContent = computerScore;

            break;
    }
}