// modules/utils/simple-utils.js
function SimpleUtils() {}

SimpleUtils.prototype.sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

SimpleUtils.prototype.findElement = function(selector, timeout) {
    return new Promise(function(resolve) {
        var startTime = Date.now();
        timeout = timeout || 5000;
        
        function search() {
            if (Date.now() - startTime > timeout) {
                resolve(null);
                return;
            }
            
            try {
                var element = null;
                if (selector.startsWith('text(')) {
                    var text = selector.match(/text\("([^"]+)"\)/)[1];
                    element = text(text).findOne(100);
                } else if (selector.startsWith('desc(')) {
                    var desc = selector.match(/desc\("([^"]+)"\)/)[1];
                    element = desc(desc).findOne(100);
                } else {
                    element = text(selector).findOne(100);
                }
                
                if (element) {
                    resolve(element);
                } else {
                    setTimeout(search, 200);
                }
            } catch (e) {
                setTimeout(search, 200);
            }
        }
        
        search();
    });
};

module.exports = SimpleUtils;