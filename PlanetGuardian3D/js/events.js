var currentShieldSelected;
var planetSelected;
var difficultySelected;
var stardustScoreElement;

document.addEventListener('DOMContentLoaded', function() {
    stardustScoreElement = document.getElementById('scoreValue');
    var playButton = document.getElementById('playButton');

    function updatePlayButton() {
        playButton.disabled = (planetSelected === undefined || difficultySelected === undefined);
    }

    // Used for HUD shield icons — toggles size to show active selection
    function setupSizeToggle(cls, onSelect) {
        document.querySelectorAll('.' + cls).forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                var selected = window.getComputedStyle(el).height === '70px';
                document.querySelectorAll('.' + cls).forEach(function(other) {
                    other.style.height = '50px';
                    other.style.width = '';
                });
                if (!selected) {
                    el.style.height = '70px';
                    el.style.width = '65px';
                    onSelect(el.id);
                } else {
                    onSelect(undefined);
                }
            });
        });
    }

    // Used for planet/difficulty — highlights the thumbnail without resizing
    function setupHighlightToggle(cls, onSelect) {
        document.querySelectorAll('img.' + cls).forEach(function(img) {
            var anchor = img.closest('.thumbnail');
            if (!anchor) return;
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                var selected = anchor.classList.contains('selected');
                document.querySelectorAll('img.' + cls).forEach(function(other) {
                    var a = other.closest('.thumbnail');
                    if (a) a.classList.remove('selected');
                });
                if (!selected) {
                    anchor.classList.add('selected');
                    onSelect(img.id);
                } else {
                    onSelect(undefined);
                }
                updatePlayButton();
            });
        });
    }

    setupSizeToggle('shield', function(id) { currentShieldSelected = id; });
    setupHighlightToggle('planet', function(id) { planetSelected = id; });
    setupHighlightToggle('difficulty', function(id) { difficultySelected = id; });

    document.getElementById('menuButton').addEventListener('click', function() {
        location.reload();
    });

    playButton.addEventListener('click', function() {
        if (planetSelected === undefined || difficultySelected === undefined) {
            location.reload();
        } else {
            closeModal('myModal');
            init();
        }
    });
});
