class LoginApp {

    constructor() {
        this.passInput = document.getElementById('passInput');
        this.loginBtn = document.getElementById('loginBtn');
        this.passGroup = document.getElementById('passGroup');
        this.hiddenGroup = document.getElementById('hiddenGroup');
        this.logOutBtn = document.getElementById('logOutBtn');
        this.isBlocked = false;
        
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
            const url = card.dataset.url;
            if (url) window.open(url, '_blank');
            });
        });
        this.passInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.onLoginBtnClick();
        });
        this.loginBtn.addEventListener('click', this.onLoginBtnClick.bind(this));
        this.logOutBtn.addEventListener('click',this.onLogOutBtnClick)
        if (localStorage.getItem("logged") === "yes"){
            this.showHiddenContent();
        }
    }

    showHiddenContent() {
        this.passGroup.style.display = 'none';
        this.loginBtn.style.display = 'none';
        this.hiddenGroup.style.display = "flex";
        //console.log('Zalogowano automatycznie lub poprawnym hasłem');
    }
    onLogOutBtnClick(){
        localStorage.clear();
        location.reload();
    }

    onLoginBtnClick() {

        if (this.isBlocked) return;
        this.isBlocked = true;

        const enteredPass = this.passInput.value.trim();
        if (enteredPass === atob("Ymxl"+"Ymxl")){
            //console.log('zalog');
            localStorage.setItem("logged", "yes");
            this.showHiddenContent();


        }else{
            //console.log('nie zalog');
            this.passInput.value = "";
        }


        setTimeout(() => {
            this.isBlocked = false;
            //console.log(enteredPass);
        }, 500);
    }
}

new LoginApp();

