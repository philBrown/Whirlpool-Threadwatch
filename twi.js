/**
 * Whirlpool Threadwatch Improved
 *
 * LICENSE
 *
 * Copyright (c) 2010 Phil Brown <phil@philipbrown.id.au>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @copyright Copyright (c) 2010 Phil Brown <phil@philipbrown.id.au>
 * @license   http://www.opensource.org/licenses/mit-license.php The MIT License
 * @version   1.0
 * @link      http://github.com/philBrown/Whirlpool-Threadwatch
 * @link      http://forums.whirlpool.net.au/forum-replies.cfm?t=1220737
 */

$.jsonp.setup({
    url: 'http://whirlpool.net.au/api/',
    callbackParameter: 'jsonp',
    timeout: 60000,
    error: function(xOptions, textStatus) {
        alert('An error of type "' + textStatus + '" occurred for URL "' + xOptions.url + '" with parameters "' + $.param(xOptions.data) + '"');
    }
});

function wpDate(dateString) {
    var parts = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\+|-)(\d{2})(\d{2})$/);
    if (null == parts) {
        this.date = null;
    }
    this.date = new Date();

    this.date.setUTCDate(parts[3]);
    this.date.setUTCMonth(parts[2] - 1);
    this.date.setUTCFullYear(parts[1]);

    var hr = parts[7] + parts[8];
    var mn = parts[7] + parts[9];

    this.date.setUTCHours(parts[4] - hr, parts[5] - mn, parts[6]);
};

wpDate.prototype.status = function(now) {
    now = now || new Date();
    var stat = {};
    stat.diff = now - this.date;

    if (stat.diff < 3600000) {
        var min = Math.round(stat.diff / 60000);
        var txt = min == 1 ? ' minute ' : ' minutes ';
        stat.age = Math.round(stat.diff / 60000) + txt + 'ago';
    } else {
        stat.age = this.date.toLocaleString();
    }
    
    switch(true) {
        case stat.diff <= 600000 :
            stat.cat = 'age1';
            break;
        case stat.diff > 600000 && stat.diff <= 3600000 :
            stat.cat = 'age2';
            break;
        case stat.diff > 3600000 && stat.diff <= 7200000 :
            stat.cat = 'age3';
            break;
        case stat.diff > 7200000 && stat.diff <= 21600000 :
            stat.cat = 'age4';
            break;
        default :
            stat.cat = 'age5';
    }

    return stat;
};

var config = {
    key: null,
    forums: null,
    startPage: 2,
    maxThreads: 30,
    refreshInterval: 1,
    interval: 60000,
    cookie: {
        key: 'mc_wp_twi_api_key',
        forums: 'mc_wp_twi_forums',
        maxThreads: 'mc_wp_twi_mt',
        startPage: 'mc_wp_twi_sp',
        refreshInterval: 'mc_wp_twi_ri'
    },
    load: function() {
        this.key = $.cookie(this.cookie.key);
        this.maxThreads = parseInt($.cookie(this.cookie.maxThreads)) || 20;
        this.startPage = parseInt($.cookie(this.cookie.startPage)) || 2;
        this.setRefreshInterval($.cookie(this.cookie.refreshInterval));
        this.forums = $.cookie(this.cookie.forums);
    },
    save: function() {
        $.cookie(this.cookie.key, this.key, {expires:999, path:'/'});
        $.cookie(this.cookie.maxThreads, this.maxThreads, {expires:999, path:'/'});
        $.cookie(this.cookie.startPage, this.startPage, {expires:999, path:'/'});
        $.cookie(this.cookie.refreshInterval, this.refreshInterval, {expires:999, path:'/'});
        $.cookie(this.cookie.forums, this.forums, {expires:999, path:'/'});
    },
    setRefreshInterval: function(ri) {
        this.refreshInterval = parseInt(ri) || 1;
        this.interval = this.refreshInterval * 60000;
        return this;
    }
};

var control = {
    urls: {},
    user: {},
    timer: null,
    gotoPage: function(page, speed, callback) {
        if (typeof speed == 'undefined') speed = 'slow';
        callback = callback || function(){};
        var offset = (parseInt(page) - 1) * 100;
        $('html, body').animate({
            scrollTop: 0
        }, speed);
        $('#pages').animate({
            left: '-' + offset + '%'
        }, speed, callback);
    },
    stopTimer: function() {
        clearInterval(this.timer);
    },
    startTimer: function(interval) {
        this.stopTimer();
        this.timer = setInterval(function() {
            control.getThreads();
        }, interval);
    },
    getInitialData: function(callback) {
        $.jsonp({
            data: {
                key: config.key,
                output: 'json',
                get: 'user url forum'
            },
            success: function(data, textStatus) {
                control.urls = data.URL;
                control.user = data.USER;
                $('#topics').empty();
                $('.profile').html(
                    $('<a>').attr({
                        href: control.urls.USER_PROFILE.replace(/%d$/, control.user.ID),
                        title: control.user.NAME
                    }).html('<strong>My User Page</strong>')
                );
                var sections = {};
                $.each(data.FORUM, function(i, forum) {
                    if (!sections[forum.SECTION]) {
                        sections[forum.SECTION] = {
                            title: forum.SECTION,
                            forums: []
                        };
                    }
                    sections[forum.SECTION].forums.push(forum);
                });

                $.each(sections, function(i, section) {
                    var container = $('<dl>').addClass('container').appendTo('#topics');
                    $('<dt>').addClass('container_title').text(section.title).appendTo(container);
                    $.each(section.forums, function(i, forum) {
                        var dd = $('<dd>').addClass('container_item').appendTo(container);
                        $('<input>').attr('type', 'checkbox').attr('id', 'f' + forum.ID).val(forum.ID).appendTo(dd);
                        $('<label>').attr('for', 'f' + forum.ID).text(forum.TITLE).appendTo(dd);
                    });
                });

                if (config.forums) {
                    $.each(config.forums.split(','), function() {
                        $('#f' + this).get(0).checked = true;
                    });
                }

                data = null;

                if (callback) callback();
            }
        });
    },
    getThreads: function(callback) {
        $.jsonp({
            data: {
                key: config.key,
                output: 'json',
                get: 'threads',
                forumids: config.forums,
                threadcount: config.maxThreads
            },
            success: function(data, textStatus) {
                $('#threads').empty();
                $.each(data.THREADS, function(i, thread) {
                    var pd = new wpDate(thread.LAST_DATE);
                    var stat = pd.status();
                    
                    var container = $('<dl>').addClass('container').addClass(stat.cat).appendTo('#threads');
                    var dt = $('<dt>').addClass('container_title').appendTo(container);
                    var fname = thread.FORUM_NAME;
                    if (thread.GROUP) {
                        fname += ' - ' + thread.GROUP;
                    }
                    $('<a>').attr('href', control.urls.THREADS.replace(/%d$/, thread.FORUM_ID))
                            .html(fname)
                            .appendTo(dt);
                    var dd = $('<dd>').addClass('container_item').appendTo(container);
                    $('<a>').attr('href', control.urls.REPLIES_PAGE.replace(/%d/, thread.ID).replace(/%d/, '-1#bottom'))
                            .html(thread.TITLE)
                            .appendTo(dd);
                    dd = $('<dd>').addClass('container_item').appendTo(container).html(' ' + stat.age);
                    $('<a>').attr('href', control.urls.USER_PROFILE.replace(/%d$/, thread.LAST.ID))
                            .html('<strong>' + thread.LAST.NAME + '</strong>')
                            .prependTo(dd);

                });

                data = null;

                control.startTimer(config.interval);
                if (callback) callback();
            }
        });
    },
    init: function(callback) {
        config.load();
        if (!config.key) {
            $('#config .control').hide();
            this.gotoPage(1, 0);
        } else {
            this.getInitialData(function() {
                control.gotoPage(config.startPage, 0, function() {
                    if (config.startPage == 3) {
                        $('#topics').hide();
                        control.getThreads();
                    }
                });
            });
        }
        
        if (callback) callback();
    }
};

jQuery(function($) {
    
    control.init(function() {
        $('#api_key').val(config.key);
        $('#max_threads').val(config.maxThreads);
        $('#start_page').val(config.startPage);
        $('#refresh_interval').val(config.refreshInterval);
    });

    $('#config_frm').submit(function(e) {
        config.key = $('#api_key').val();
        config.maxThreads = parseInt($('#max_threads').val());
        config.startPage = parseInt($('#start_page').val());
        config.setRefreshInterval($('#refresh_interval').val());
        config.save();

        control.getInitialData(function() {
            $('#topics').show();
            control.gotoPage(2, 'slow', function() {
                $('#config .control').show();
            });
        });
        return false;
    });

    $('.config_lnk').click(function(e) {
        control.stopTimer();
        control.gotoPage(1, 'slow', function() {
            $('#topics').hide();
        });
        return false;
    });

    $('.forum_lnk').click(function(e) {
        control.stopTimer();
        $('#topics').show();
        control.gotoPage(2, 'slow', function() {
            $('#threads').empty();
        });
        return false;
    });

    $('.thread_lnk').click(function(e) {
        var forums = [];
        $('#topics :checked').each(function() {
            forums.push(this.value);
        });
        config.forums = forums.join(',');
        config.save();
        control.getThreads(function() {
            control.gotoPage(3, 'slow', function() {
                $('#topics').hide();
            });
        });
        return false;
    });

    $(window).unload(function(e) {
        control.stopTimer();
    });
});

