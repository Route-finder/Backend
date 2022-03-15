let nameInput = document.getElementById("username");

function getName() {
    console.log("getName Running")
    let cookie = 'name=' + nameInput.value + '; SameSite=None; Secure';
    document.cookie = cookie;
}