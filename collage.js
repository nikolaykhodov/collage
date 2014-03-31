/*
 * Форматирование строк "бла-бла {0} и {1}"
 */
String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined' ? args[number] : match ;
    });
};

var Loader = {
    /*
     * Загрузка миниатюр для редактора коллажа
     * @param {Object} imgs {original_path: thumbnail_path, ... }, где original_path - путь к полноразмерной картинке (для редактора),
     *                                                                 thumbnail_path - путь к миниаютре 
     */
    load: function(imgs) {
        var html = '';
        for(var orig_path in imgs) {
            html += '<img src="%thumbnail%" class="element" path="%original%" />'.replace('%original%', orig_path).
                        replace('%thumbnail%', imgs[orig_path]);
        }
        $('#elements').html(html);
          
    }
};
/*
 * Класс фрейма. Создает внутри $(options.canvas). Назначает им стили:
 * .frame - обычный класс
 * .frame_selected - класс выбранного фрейма
 * .frame_droppable - класс для фрейма, куда может быть помещена картинка
 * .frame_drophover - класс для фрейма, в который попадает картинка
 *
 * По умолчанию, во фреймы могут помещены картинки с классом .element.
 */
function Frame(opts) {
    /*
     * Параметры для фрейма
     */
    var options = {
        left: 0, 
        top: 0, 
        width: 0, 
        height: 0, 
        angle: 0, 
        canvas: null, // DIV для фреймов
        text: "", // текст по умолчанию
        acceptDragSelector: ".element", // селектор элементов, которые могут быть помещены во фрейм
        onSelect: function(frame) { }, // срабатывает при выборе фрейма
        image: null, // параметры для изображения
    }, 
    div = null, image = null, myself = this,
    selected = false;

    $.extend(options, opts);

    /*
     * Удалить фрейм с канвы
     */
    function clear() {
        $(div).remove();
    }
    this.clear = clear;

    /*
     * Выбрать фрейм
     */
    function select() {
        $(div).addClass('frame_selected');
        selected = true;
    }
    this.select = select;

    /*
     * Убрать выделение фрейма
     */
    function unselect() {
        $(div).removeClass('frame_selected');
        selected = false;
    }
    this.unselect = unselect;

    /*
     * Перевернуть изображение по ОХ
     */
    function flipImage() {
        $(image).toggleClass('flipped');
    }
    this.flipImage = flipImage;

    /*
     * Перевернуть изображение по OY
     */
    function flopImage() {
        $(image).toggleClass('flopped');
    }
    this.flopImage = flopImage;

    /*
     * Возвращает информацию о фрейме, пригодную для повторной инициализации
     */
    function json(json) {
        var pos = $(image).position();

        var json = {
            top: options.top,
            left: options.left,
            height: options.height,
            width: options.width,
            text: options.text,
            angle: options.angle,
        };

        if(image) {
            json.image = {
                path: $(image).attr('src'),
                left: parseInt($(image).css('left') || pos.left),
                top: parseInt($(image).css('top') || pos.top),
                width: parseInt($(image).css('width') || $(image).width()),
                height: parseInt($(image).css('height') || $(image).height()),
                flipped: $(image).hasClass('flipped'),
                flopped: $(image).hasClass('flopped')
            };
        }

        return json;
    }
    this.json = json;

    /*
     * Помещает картинку во фрейм
     * @param {String} path Путь к файлу
     * @param {function() {} } onLoad Срабатывает после загрузки изображения
     */
    function setImage(path, onLoad) {
        image = document.createElement('img');

        var drag = {};
        $(image).attr('src', path).
        draggable({
            start: function(event, ui) {
                // Запоминаем координаты картинки и мышки относительно страницы
                $.extend(drag, { 
                    top: parseFloat($(this).css('top') || $(this).position().top),
                    left: parseFloat($(this).css('left') || $(this).position().left),
                    mouseX: event.pageX,
                    mouseY: event.pageY
                });
            },

            drag: function(event, ui) {
                var angle = -Math.PI * options.angle / 180;

                // Смещение относительно страницы
                var deltaX = event.pageX - drag.mouseX;
                var deltaY = event.pageY - drag.mouseY;

                // Смещение относительно повернутого фрейма
                var new_top =  deltaX * Math.sin(angle) + deltaY * Math.cos(angle);
                var new_left = deltaX * Math.cos(angle)  - deltaY * Math.sin(angle);

                ui.position.top = drag.top + new_top;
                ui.position.left = drag.left + new_left;

            }
        }).load(function() {
            onLoad();
        });
        $(div).empty().append(image);
    }
    this.setImage = setImage;

    /*
     * Удаляем картинку из фрейма и возвращает текст по умолчанию
     */
    function removeImage() {
        image = null;
        text(options.text);
    }
    this.removeImage = removeImage;

    /*
     * Текст внутри фрейма
     * @param {String} text Текст
     */
    function text(text) {
        if(!text) 
            return options.text;

        options.text = text;
        $(div).empty().html('<span class="help">' + text + '</span>');
    }
    this.text = text;

    /*
     * Задает координаты картинки внутри фрейма
     * @param {x: ..., y: ..., left: ..., top: ...} Координаты
     */
    function setImagePosition(coords) {
        $(image).css(coords);
    }
    this.setImagePosition = setImagePosition;


    /*
     * Подгоняет изображание под размеры фрейма
     */
    function fitImage() {
        var height = $(image).height();
        var width = $(image).width();
        var ratio = width * 1.0 / height;

        if(height > options.height) {
            height = options.height;
            width = Math.ceil(height * ratio);
        }

        if(width > options.width) {
            width = options.width;
            height = Math.ceil(width / ratio);
        }

        $(image).css({
            top: '0px',
            left: '0px',
            width: (width) + 'px',
            height: (height) + 'px',
            position: 'absolute',
            display: 'block'
        });
    }
    this.fitImage = fitImage;

    /*
     * Масштабирует изображение: центр не двигается, линейное увеличение/уменьшение на коэффицент.
     * Например, coeff = 0.1, то диагональ новой картинки будет увеличена на 10%
     * @param {float} coeff > 0 - увеличение, < 0  - сжатие
     */
    function zoomImage(coeff) {
        var dims = {
                left: parseInt($(image).css('left') || pos.left),
                top: parseInt($(image).css('top') || pos.top),
                width: parseInt($(image).css('width') || $(image).width()),
                height: parseInt($(image).css('height') || $(image).height())
        };
        var delta_x = Math.abs(coeff * dims.width / 2);
        var delta_y = Math.abs(coeff * dims.height / 2);

        if(coeff > 0) {
            dims.left  -= delta_x;
            dims.width += 2*delta_x;
            dims.top   -= delta_y;
            dims.height += 2*delta_y;
        } else {
            dims.left  += delta_x;
            dims.width -= 2*delta_x;
            dims.top   += delta_y;
            dims.height -= 2*delta_y;
        }

        $(image).css(dims);
    }

    /*
     * Настройка фрейма
     */
    function init() {
        var zIndex = parseInt($(options.canvas).data('zIndex'));
        zIndex = !isNaN(zIndex) ? zIndex + 1 : 1;
        $(options.canvas).data('zIndex', zIndex);
        
        div = document.createElement('div');
        
        var rad = -Math.PI / 180 * options.angle;
        $(div).
        css({
            width:  (options.width) + 'px', 
            height: (options.height) + 'px', 
            left:   (options.left) + 'px', 
            top:    (options.top) + 'px', 
            zIndex: zIndex,
            '-webkit-transform': 'rotate(' + (options.angle) + 'deg)',
            '-o-transform': 'rotate(' + (options.angle) + 'deg)',
            '-ms-transform': 'rotate(' + (options.angle) + 'deg)',
            '-moz-transform': 'rotate(' + (options.angle) + 'deg)',
            '-webkit-transform': 'rotate(' + (options.angle) + 'deg)',
            'transform': 'rotate(' + (options.angle) + 'deg)',
            '-ms-filter': "progid:DXImageTransform.Microsoft.Matrix(M11={0}, M12={1}, M21={2}, M22={3}, SizingMethod='auto expand');".format(
                            Math.cos(rad), Math.sin(rad), Math.sin(rad), Math.cos(rad)
                          ),
            'filter': "progid:DXImageTransform.Microsoft.Matrix(M11={0}, M12={1}, M21={2}, M22={3}, SizingMethod='auto expand');".format(
                            Math.cos(rad), -Math.sin(rad), Math.sin(rad), Math.cos(rad)
                          )
        }).
        addClass('frame').
        click(function(event) {
            if(typeof options.onSelect == 'function') {
                options.onSelect(myself);
            }

            select();
            event.stopPropagation();
        }).
        droppable({
            accept:      options.acceptDragSelector,
            activeClass: "frame_droppable",
            hoverClass:  "frame_drophover",
            tolerance: 'pointer',
            drop: function(event, ui) {
                if($(options.canvas).data('currentZIndex') != zIndex)
                    return;
                myself.setImage($(ui.draggable).attr('path'), function() {
                    myself.fitImage(); 
                });
            }
        }).
        mousemove(function() {
            $(options.canvas).data('currentZIndex', zIndex);
        }).
        mousewheel(function(event, delta) {
            if(!selected)
                return;
            zoomImage(0.1 * delta);
            return false;
        }).
        appendTo(options.canvas);

        if(options.text) 
            text(options.text);

        if(options.image && options.image.path) {
            setImage(options.image.path);
            setImagePosition(options.image);

            if(options.image.flipped)
                flipImage();

            if(options.image.flopped)
                flopImage();
        }
    }

    init();

    return this;
}

var Editor = {
    frames: [],
    current_frame: null,
    canvas: null, 

    /*
     * Инициализация редактора
     * @param {Object} options canvas - DIV для фреймов
     *                         controls - DIV с элементами управления
     *                         images - картинки для конструктора
     *                         onChoose - function(frame) { ... }
     */
    init: function(options) {
        this.canvas = options.canvas;
        this.controls = options.controls;
        this.images = options.images;
        this.onChoose = options.onChoose;

        var self = this;
        $(this.canvas).click(function() {
            self.unselectAll();
        });

        $(this.images).draggable({
            helper: "clone",
            zIndex: 10000,
            cursorAt: {top: 0, left: 0}
        });

        // Создаем 6 случайных фреймов
        for(var i = 1; i < 6; i++) {
            var frame = new Frame({
                top: rand(300), 
                left: rand(300), 
                width: 300,//rand(300), 
                height: 300,//rand(300), 
                angle: rand(-90),
                text: (i) + ' box',
                canvas: this.canvas,
                onSelect: function(frame) { self.onSelect(frame); }
            });
            this.frames.push(frame);
        }
    },

    /*
     * При выборе фрейма все остальные погасить 
     */
    onSelect: function(frame) {
        this.current_frame = frame;
        this.unselectAll();
        $(this.controls).show();
    },

    
    unselectAll: function() {
        $(this.controls).hide();

        $.each(this.frames, function(index, frame) {
            frame.unselect();
        });
    },

    remove: function() {
        if(this.current_frame)
            this.current_frame.removeImage();
    },

    fit: function() {
        if(this.current_frame)
            this.current_frame.fitImage();
    },

    flip: function(index) {
        if(this.current_frame)
            this.current_frame.flipImage();
    },

    flop: function(index) {
        if(this.current_frame)
            this.current_frame.flopImage();
    },

    toJSON: function() {
        var json = [];

        $.each(this.frames, function(index, frame) {
            json.push(frame.json());
        });

        return json;
    },

    loadJSON: function(json) {
        var self = this;
        this.clear();

        $.each(json, function(index, frame) {
            $.extend(frame, {onSelect: function(frame) { self.onSelect(frame); }, canvas: self.canvas});
            self.frames.push(new Frame(frame));    
        });
    },

    clear: function() {
        $.each(this.frames, function(index, frame) {
            frame.clear();
        });
        this.frames = [];
    }
};
function rand(max) {
    max = max || 300;
    return Math.ceil(max * Math.random());
}
$(document).ready(function() {
    var imgs = {};
    for(var i = 1; i <= 73; i++) {
        imgs['imgs/orig_' + (i) + '.jpg'] = 'imgs/thumbnail_' + (i) + '.jpg';
    }
    // Загрузка изображений
    Loader.load(imgs);
    Editor.init({
        canvas: $('#canvas'), controls: $('#controls'), images: $('#elements img')
    });
});

function show_modal(id) {
    $('#modal_background').show();
    $('#' + id).show();
}

function hide_modal(id) {
    $('#modal_background').hide();
    $('#' + id).hide();
}

function save_code() {
    $('#save_code').html(JSON.stringify(Editor.toJSON()));
    show_modal('save_dialog');
    $('#save_code').select();
}

function load_code() {
    $('#load_code').html('');
    show_modal('load_dialog');
    $('#load_code').select();
}

function load_json() {
    hide_modal('load_dialog'); 
    Editor.loadJSON(JSON.parse($('#load_code')[0].value));
}
