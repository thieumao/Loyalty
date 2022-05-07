/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
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
import {
  useCameraDevices,
  Camera,
} from 'react-native-vision-camera';
import ImageEditor, { ImageCropData } from '@react-native-community/image-editor';
import MlkitOcr from 'react-native-mlkit-ocr';
import CameraRoll from '@react-native-community/cameraroll';
import { GestureHandlerRootView, PinchGestureHandler, PinchGestureHandlerGestureEvent, TapGestureHandler } from 'react-native-gesture-handler';
import Reanimated, { Extrapolate, interpolate, useAnimatedGestureHandler, useAnimatedProps, useSharedValue } from 'react-native-reanimated';

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);
Reanimated.addWhitelistedNativeProps({
  zoom: true,
});

const App = () => {
  const round = (num: number) => Math.round(num * 1000) / 1000;
  const [hasPermission, setHasPermission] = useState(false);

  const devices = useCameraDevices();
  const device = devices.back;
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const wPixel = 200; // px
  const hPixel = 100; // px
  const wPercent = wPixel / screenWidth * 100; // %
  const hPercent = hPixel / screenHeight * 100; // %
  const xPercent = (100 - wPercent) / 2; // %
  const yPercent = (100 - hPercent) / 2; // %
  const left = screenWidth * xPercent / 100; // px
  const top = screenHeight * yPercent / 100; // px
  const width = screenWidth * wPercent / 100; // px
  const height = screenHeight * hPercent / 100; // px

  const [photoUri, setPhotoUri] = useState<string>('');
  const [cropUri, setCropUri] = useState('');
  const [text, setText] = useState('');

  const camera = useRef<Camera>(null);

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
    // await CameraRoll.save(uri, { type: 'photo' });
    setPhotoUri(uri);
    const data: any = await getImageSize(uri);
    const isIOS = Platform.OS === 'ios';

    const imageWidth = data?.width || 0; //isIOS ? (data?.width || 0) : (photoData?.width || 0);
    const imageHeight = data?.height || 0; //isIOS ? (data?.height || 0) : (photoData?.height || 0);

    const left2 = imageWidth * xPercent / 100;
    const top2 = imageHeight * yPercent / 100;
    const width2 = imageWidth * wPercent / 100;
    const height2 = imageHeight * hPercent / 100;

    const cropDataIos: ImageCropData = {
      offset: { x: left2, y: top2 },
      size: { width: width2, height: height2 },
    };
    const cropDataAndroid: ImageCropData = {
      offset: { x: top2, y: left2 },
      size: { width: height2, height: width2 },
    };
    const cropData: ImageCropData = isIOS ? cropDataIos : cropDataAndroid;

    const newUri = await ImageEditor.cropImage(uri, cropData);
    // await CameraRoll.save(newUri, { type: 'photo' });
    setCropUri(newUri);

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

  const onDoubleTap = async () => {
    if (photoUri.length === 0) {
      await onTakePhoto();
    } else {
      await onClose();
    }
  }
  const renderOverlay = () => {

    return (
      <View style={[StyleSheet.absoluteFill]}>
        {photoUri.length > 0 && (
          <Image style={[{
            left: 0,
            top: 0,
            width: screenWidth,
            height: screenHeight,
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
      </View>
    );
  };

  const renderFrameView = () => {
    return (
      <View style={[StyleSheet.absoluteFill]} pointerEvents="none">
        {/* <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} />
        <View style={{ width: '100%', flex: 1, flexDirection: 'row' }}>
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
          <View style={{ opacity: 0, flex: 1 }} />
          <View style={{ width: `${xPercent}%`, height: '100%', backgroundColor: 'black', opacity: 0.3 }} />
        </View>
        <View style={{ width: '100%', height: `${yPercent}%`, backgroundColor: 'black', opacity: 0.3 }} /> */}
        <View style={[{
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
        />
      </View>
    );
  }

  return device !== undefined && hasPermission ? (
    <GestureHandlerRootView style={{
      width: screenWidth,
      height: screenHeight,
    }}>
      <Reanimated.View style={{
        width: screenWidth,
        height: screenHeight,
      }}>
        <TapGestureHandler onEnded={onDoubleTap} numberOfTaps={2}>
          <Reanimated.View style={{
            width: screenWidth,
            height: screenHeight,
          }}>
            <ReanimatedCamera
              ref={camera}
              style={{
                left: 0,
                top: 0,
                width: screenWidth,
                height: screenHeight
              }}
              device={device}
              isActive={true}
              enableHighQualityPhotos={true}
              photo={true}
              orientation="portrait"
            />
            {photoUri.length === 0 && renderFrameView()}
            {photoUri.length > 0 && renderOverlay()}

          </Reanimated.View>
        </TapGestureHandler>
      </Reanimated.View>
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
    </GestureHandlerRootView>
  ) : (
    <View>
      <Text>No available cameras</Text>
    </View>
  );
}

export default App;
