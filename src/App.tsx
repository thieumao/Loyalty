/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import { runOnJS } from 'react-native-reanimated';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
// import { OCRFrame, scanOCR } from 'vision-camera-ocr2';
import {
  useCameraDevices,
  useFrameProcessor,
  Camera,
  CameraDeviceFormat,
} from 'react-native-vision-camera';
import ImageEditor, { ImageCropData } from '@react-native-community/image-editor';
import MlkitOcr from 'react-native-mlkit-ocr';
import CameraRoll from '@react-native-community/cameraroll';

const App = () => {
  const round = (num: number) => Math.round(num * 1000) / 1000;
  const [hasPermission, setHasPermission] = useState(false);

  const devices = useCameraDevices();
  const device = devices.back;
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = screenWidth * 16 / 9;//Dimensions.get('window').height;
  const xPercent = 15;
  const yPercent = 35;
  const left = screenWidth * xPercent / 100;
  const top = screenHeight * yPercent / 100;
  const width = screenWidth * (100 - 2 * xPercent) / 100;
  const height = screenHeight * (100 - 2 * yPercent) / 100;

  const [w, setW] = useState<number>(screenWidth);
  const [h, setH] = useState<number>(screenHeight);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [cropUri, setCropUri] = useState('');
  const [text, setText] = useState('');

  const camera = useRef<Camera>(null);

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

  const requestSavePermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
  
    const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
    if (permission == null) return false;
    let hasPermission = await PermissionsAndroid.check(permission);
    if (!hasPermission) {
      const permissionRequestResult = await PermissionsAndroid.request(permission);
      hasPermission = permissionRequestResult === 'granted';
    }
    return hasPermission;
  };

  const onTakePhoto = async () => {
    const hasPermission = await requestSavePermission();
    if (!hasPermission) {
      Alert.alert('Permission denied!', 'Vision Camera does not have permission to save the media to your camera roll.');
      return;
    }

    console.log('Click take photo');
    const photoData = await camera.current?.takePhoto({
      qualityPrioritization: 'speed',
      flash: 'off',
      skipMetadata: true,
    });
    const uri = `file://${photoData?.path}`;
    await CameraRoll.save(uri, { type: 'photo' });
    setPhotoUri(uri);
    console.log('uri = ', uri)
    const data: any = await getImageSize(uri);

    const isIOS = Platform.OS === 'ios';
    // hinh chu nhat doc
    // const imageWidth = isIOS ? (data?.width || 0) : (photoData?.width || 0);
    // const imageHeight = isIOS ? (data?.height || 0) : (photoData?.height || 0);
    // hinh chu nhat ngang
    const imageWidth = isIOS ? (data?.width || 0) : (photoData?.width || 0);
    const imageHeight = isIOS ? (data?.height || 0) : (photoData?.height || 0);
  
    // console.log('number of format = ', device?.formats.length);
    // console.log('format = ', JSON.stringify(device?.formats?.map(item => {
    //   return {
    //     photoHeight: item.photoHeight,
    //     photoWidth: item.photoWidth,
    //     radio: item.photoHeight > 0 ? item.photoWidth / item.photoHeight : 0
    //   }
    // })));
    console.log('screenWidth = ', screenWidth);
    console.log('screenHeight = ', screenHeight);
    console.log('imageWidth = ', data?.width);
    console.log('imageHeight = ', data?.height);
    console.log('imageWidth2 = ', photoData?.width);
    console.log('imageHeight2 = ', photoData?.height);

    const left2 = imageWidth * xPercent / 100;
    const top2 = imageHeight * yPercent / 100;

    const width2 = imageWidth * (100 - 2 * xPercent) / 100;
    const height2 = imageHeight * (100 - 2 * yPercent) / 100;

    // const isIOS = Platform.OS === 'ios';
    // const cropDataAndroid: ImageCropData = {
    //   offset: { x: top2, y: left2 },
    //   size: { width: height2, height: width2 },
    //   resizeMode: 'cover',
    // };
    const cropDataIos: ImageCropData = {
      offset: { x: left2, y: top2 },
      size: { width: width2, height: height2 },
      // displaySize: { width: width2, height: height2 },
      resizeMode: 'cover',
    };
    const cropData: ImageCropData = cropDataIos; //isIOS ? cropDataIos : cropDataAndroid;

    const newUri = await ImageEditor.cropImage(uri, cropData);
    await CameraRoll.save(newUri, { type: 'photo' });
    setCropUri(newUri);
    console.log('newUri = ', newUri)

    const resultFromFile = await MlkitOcr.detectFromUri(newUri);
    if (resultFromFile) {
      const nextText = resultFromFile.map((item: any) => item?.text || '').join('\n');
      setText(nextText);
    }
  }

  const onClose = async () => {
    setPhotoUri('');
    setCropUri('');
    setText('');
  }

  const renderOverlay = () => {

    return (
      <View style={[StyleSheet.absoluteFill]}>
        {photoUri.length > 0 && (
          <Image style={[{
            left: 0,
            top: 0,
            width: screenWidth, 
            height: screenWidth * 16 / 9,
            // width: screenWidth,
            // height: screenHeight,
            opacity: 1
          }]}
            source={{ uri: photoUri }}
            resizeMode="cover"
          />
        )}
        {cropUri.length > 0 && (
          <Image style={[{
            position: 'absolute',
            left: left,
            top: top,
            width: width,
            height: height,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'red'
          }]}
            source={{ uri: cropUri }}
            resizeMode="cover"
          />
        )}
        {text.length > 0 && (
          <Text style={{
            left: left,
            top: top,
            width: width,
            height: height,
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            color: 'red'
          }}>
            {text}
          </Text>
        )}
        {photoUri.length === 0 && (
          <TouchableOpacity style={{
            position: 'absolute',
            bottom: 48,
            width: screenWidth,
            justifyContent: 'center',
            alignItems: 'center',
          }} onPress={onTakePhoto}>
            <Text style={{ color: 'red', fontSize: 20 }}>{`TAKE PHOTO`}</Text>
          </TouchableOpacity>
        )}
        {photoUri.length > 0 && (
          <TouchableOpacity style={{
            top: 48,
            right: 48,
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
          }} onPress={onClose}>
            <Text style={{ color: 'yellow', fontSize: 20 }}>{`CLOSE`}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFrameView = () => {
    return (
      <View style={[StyleSheet.absoluteFill]}>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
        <View style={{ width: '100%', flex: 1, flexDirection: 'row' }}>
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
          <View style={{ opacity: 0, flex: 1 }} />
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
        </View>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
      </View>
    );
  }

  // const format: CameraDeviceFormat = {
  //   photoHeight: height,
  //   photoWidth: width,
  //   videoHeight: height,
  //   videoWidth: width,
  //   maxISO: 100,
  //   minISO: 0,
  //   fieldOfView: 10,
  //   maxZoom: 100,
  //   colorSpaces: [],
  //   supportsVideoHDR: false,
  //   supportsPhotoHDR: true,
  //   frameRateRanges: [],
  //   autoFocusSystem: 'contrast-detection',
  //   videoStabilizationModes: [],
  //   pixelFormat: '420f'
  // }
  const formats = device?.formats || [];
  const filterFormats = device?.formats?.filter(item => {
    const radio = round(item.photoHeight > 0 ? item.photoWidth / item.photoHeight : 0);
    const radio169 = round(16 / 9);
    return radio == radio169;
    // return {
    //   photoHeight: item.photoHeight,
    //   photoWidth: item.photoWidth,
    //   radio: item.photoHeight > 0 ? item.photoWidth / item.photoHeight : 0
    // }
  }) || [];
  const format = filterFormats.length > 0 ? filterFormats[0] : formats[0];
  return device !== undefined && hasPermission ? (
    <View style={{
      width: screenWidth,
      height: screenHeight,
    }}>
      <Camera
        ref={camera}
        style={{
          left: 0,
          top: 0,
          width: screenWidth, 
          height: screenWidth * 16 / 9}}
        // style={[StyleSheet.absoluteFill]}
        // frameProcessor={frameProcessor}
        device={device}
        isActive={true}
        enableHighQualityPhotos={true}
        photo={true}
        orientation="portrait"
        // frameProcessorFps={5}
        // torch="on"
        // enableZoomGesture={true}
        // format={format}
      />
      {photoUri.length === 0 && renderFrameView()}
      {renderOverlay()}
    </View>
  ) : (
    <View>
      <Text>No available cameras</Text>
    </View>
  );
}

export default App;
