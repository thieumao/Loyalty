/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';

import { runOnJS } from 'react-native-reanimated';
import {
  StyleSheet,
  View,
  Text,
  LayoutChangeEvent,
  PixelRatio,
  TouchableOpacity,
  Alert,
  Clipboard,
  Dimensions,
  Platform,
  Image,
  NativeModules,
} from 'react-native';
// import { OCRFrame, scanOCR } from 'vision-camera-ocr2';
import {
  useCameraDevices,
  useFrameProcessor,
  Camera,
} from 'react-native-vision-camera';
import ImageEditor, { ImageCropData } from 'react-native-community-image-editor2';

const App = () => {
  const [hasPermission, setHasPermission] = useState(false);
  // const [ocr, setOcr] = useState<OCRFrame>();
  // const [pixelRatio, setPixelRatio] = useState<number>(1);
  const [pixelRatioX, setPixelRatioX] = useState<number>(1);
  const [pixelRatioY, setPixelRatioY] = useState<number>(1);

  const [viewX, setViewX] = useState<number>(1);
  const [viewY, setViewY] = useState<number>(1);
  const [viewWidth, setViewWidth] = useState<number>(1);
  const [viewHeight, setViewHeight] = useState<number>(1);
  const devices = useCameraDevices();
  const device = devices.back;
  const isIOS = Platform.OS === 'ios';
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const xPercent = 25;
  const yPercent = 25;
  const xTop = screenWidth * xPercent / 100;
  const yTop = screenHeight * yPercent / 100;
  const xBottom = screenWidth - xTop;
  const yBottom = screenHeight - yTop;

  const [w, setW] = useState<number>(screenWidth);
  const [h, setH] = useState<number>(screenHeight);
  const [photo, setPhoto] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string>('');
  const [cropUri, setCropUri] = useState('');
  const [text, setText] = useState('');

  const cameraRef = useRef();
  const camera = useRef<Camera>(null);

  const onLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setViewX(x);
    setViewY(y);
    setViewWidth(width);
    setViewHeight(height);
    // Alert.alert(`x = ${x}, y = ${y}, width = ${width}, height = ${height}`);
  }

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // const data = scanOCR(frame);
    // runOnJS(setOcr)(data);
    if (frame && frame.width && frame.width !== w) {
      // setW(frame.width);
      runOnJS(setW)(frame.width);
    }
    if (frame && frame.height && frame.height !== h) {
      // setH(frame.height);
      runOnJS(setH)(frame.height);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
    })();
  }, []);

  const getImageSize = async (uri: string) => new Promise(resolve => {
    Image.getSize(uri, (width, height) => {
      // resolve({ width: width < height ? width: height, height: width < height ? height: width });
      resolve({ width, height });
    });
  });

  const onTakePhoto = async () => {
    console.log('Click take photo');
    const photoData = await camera.current?.takePhoto({
      // photoCodec: 'jpeg',
      qualityPrioritization: 'speed',
      flash: 'off',
      // quality: 90,
      skipMetadata: true,
    });
    // const { path } = photoData;
    const uri = `file://${photoData?.path}`;
    setPhotoUri(uri);
    setPhoto(JSON.stringify(photoData));
    // console.log('onTakePhoto photo = ', photoData);
    const imageSize: any = await getImageSize(uri);
    const imageWidth = imageSize?.width || 0;
    const imageHeight = imageSize?.height || 0;
    console.log("uri = ", uri);
    console.log("imageWidth = ", imageWidth);
    console.log("imageHeight = ", imageHeight);

    // const cropDataIos: ImageCropData = {
    //   offset: { x: imageWidth / 4, y: imageHeight / 4 },
    //   size: { width: imageWidth / 2, height: imageHeight / 2 },
    //   displaySize: { width: imageWidth / 2, height: imageHeight / 2 },//{width: screenWidth / 2, height: screenHeight / 2},
    //   resizeMode: 'cover',
    // };
    // const cropDataAndroid: ImageCropData = {
    //   offset: { x: imageWidth / 2, y: imageHeight / 2 },
    //   size: { width: imageWidth, height: imageHeight },
    //   displaySize: { width: imageWidth, height: imageHeight },
    //   resizeMode: 'cover',
    // };
    // const cropData: ImageCropData = isIOS ? cropDataIos : cropDataAndroid;
    const w2 = w < h ? w : h;
    const h2 = w < h ? h : w;
    // const imageWidth1 = imageWidth < imageHeight ? imageWidth : imageHeight;
    // const imageHeight1 = imageWidth < imageHeight ? imageHeight : imageWidth;
    const cropData: ImageCropData = {
      offset: { x: imageHeight / 4, y: imageWidth / 4 },
      size: { width: imageHeight / 2, height: imageWidth / 2 },
      // displaySize: { width: imageWidth / 2, height: imageHeight / 2 },//{width: screenWidth / 2, height: screenHeight / 2},
      resizeMode: 'cover',
    };
    console.log('cropData = ', JSON.stringify(cropData));
    const newUri = await ImageEditor.cropImage(uri, cropData);
    const imageSize2: any = await getImageSize(newUri);
    const imageWidth2 = imageSize2?.width || 0;
    const imageHeight2 = imageSize2?.height || 0;
    console.log("Cropped image newUri = ", newUri);
    console.log("Cropped image imageWidth2 = ", imageWidth2);
    console.log("Cropped image imageHeight2 = ", imageHeight2);
    setCropUri(newUri);
  }

  const onClose = async () => {
    setPhotoUri('');
    setCropUri('');
  }

  const renderOverlay = () => {

    const { StatusBarManager } = NativeModules;
    // const top = isIOS ? screenHeight / 4 : screenHeight / 4 + StatusBarManager.HEIGHT / 2;
    const top = screenHeight / 4;
    return (
      <View style={[StyleSheet.absoluteFill]}>
        {photoUri.length > 0 && (
          <Image style={[{
            position: 'absolute',
            left: 0,
            top: 0,
            width: screenWidth,
            height: screenHeight,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: 1
          }]}
            source={{ uri: photoUri }}
            resizeMode="cover"
          />
        )}
        {cropUri.length > 0 && (
          <Image style={[{
            position: 'absolute',
            left: screenWidth / 4,
            top: top,
            width: screenWidth / 2,
            height: screenHeight / 2,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'red'
          }]}
            source={{ uri: cropUri }}
            resizeMode="cover"
          />
        )}
        <Text style={{ marginTop: 10 }}>{`screenWidth = ${screenWidth}`}</Text>
        <Text style={{ marginTop: 10 }}>{`screenHeight = ${screenHeight}`}</Text>
        <Text style={{ marginTop: 10 }}>{`w = ${w}`}</Text>
        <Text style={{ marginTop: 10 }}>{`h = ${h}`}</Text>
        {/* <Text style={{ marginTop: 10 }}>{`photo = ${photo}`}</Text> */}
        {/* <Text style={{ marginTop: 10 }}>{`photoUri = ${photoUri}`}</Text> */}
        <Text style={{ marginTop: 10 }}>{`cropUri = ${cropUri}`}</Text>
        <TouchableOpacity style={{ marginTop: 10 }} onPress={onTakePhoto}>
          <Text style={{ marginTop: 10, color: 'red' }}>{`TAKE PHOTO`}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 10 }} onPress={onClose}>
          <Text style={{ marginTop: 10, color: 'yellow' }}>{`CLOSE`}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFrameView = () => {
    return (
      <View style={[StyleSheet.absoluteFill]}>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
        <View style={{ width: '100%', flex: 1, flexDirection: 'row' }}>
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
          <View style={{ opacity: 0, flex: 1 }} onLayout={onLayout} />
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
        </View>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
      </View>
    );
  }

  return device !== undefined && hasPermission ? (
    <>
      <Camera
        ref={camera}
        style={[StyleSheet.absoluteFill]}
        frameProcessor={frameProcessor}
        device={device}
        isActive={true}
        enableHighQualityPhotos={true}
        photo={true}
        orientation="portrait"
        frameProcessorFps={5}
        onLayout={(event: LayoutChangeEvent) => {
          setPixelRatioX(
            event.nativeEvent.layout.width /
            PixelRatio.getPixelSizeForLayoutSize(
              event.nativeEvent.layout.width
            )
          );
          setPixelRatioY(
            event.nativeEvent.layout.height /
            PixelRatio.getPixelSizeForLayoutSize(
              event.nativeEvent.layout.height
            )
          );
        }}
      />
      {renderFrameView()}
      {renderOverlay()}
    </>
  ) : (
    <View>
      <Text>No available cameras</Text>
    </View>
  );
}

export default App;
